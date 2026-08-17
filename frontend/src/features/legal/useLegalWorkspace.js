import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createContact,
  createLegalLead,
  createLegalMatter,
  createLegalTask,
  getContacts,
  getLegalLeads,
  getLegalMatters,
  getLegalTasks,
  updateLegalLead,
  updateLegalMatter,
  updateLegalTask,
} from '../../services/api';
import {
  createDemoWorkspace,
  makeLocalId,
  readDemoWorkspace,
  writeDemoWorkspace,
} from './legalWorkspace';

function apiErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Não foi possível concluir a operação.';
}

export default function useLegalWorkspace({ demoMode }) {
  const [workspace, setWorkspace] = useState(() => (demoMode ? readDemoWorkspace() : { leads: [], matters: [], tasks: [] }));
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(!demoMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const commitDemo = useCallback((producer) => {
    setWorkspace((current) => {
      const next = producer(current);
      writeDemoWorkspace(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (demoMode) return;
    setLoading(true);
    setError('');
    try {
      const [leadsResponse, mattersResponse, tasksResponse, contactsResponse] = await Promise.all([
        getLegalLeads({ limit: 100 }),
        getLegalMatters({ limit: 100 }),
        getLegalTasks({ limit: 100 }),
        getContacts('', {}),
      ]);
      setWorkspace({
        leads: leadsResponse.data.items,
        matters: mattersResponse.data.items,
        tasks: tasksResponse.data.items,
      });
      setContacts(contactsResponse.data);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runMutation = useCallback(async (operation) => {
    setSaving(true);
    setError('');
    try {
      return await operation();
    } catch (requestError) {
      const message = apiErrorMessage(requestError);
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  const addLead = useCallback((form) => runMutation(async () => {
    if (demoMode) {
      const contactId = makeLocalId('contact');
      const now = new Date().toISOString();
      const lead = {
        id: makeLocalId('lead'),
        contactId,
        contact: { id: contactId, name: form.clientName, phone: form.phone, email: form.email || null },
        title: form.title,
        area: form.area,
        stage: form.stage || 'NOVO_CONTATO',
        urgency: form.urgency || 'MEDIA',
        summary: form.summary || null,
        source: 'manual',
        nextActionAt: form.nextActionAt || null,
        createdAt: now,
        updatedAt: now,
        _count: { tasks: 0 },
      };
      commitDemo((current) => ({ ...current, leads: [lead, ...current.leads] }));
      return lead;
    }

    let contactId = form.contactId;
    if (!contactId) {
      const contactResponse = await createContact({ name: form.clientName, phone: form.phone, email: form.email || null });
      contactId = contactResponse.data.id;
    }
    const response = await createLegalLead({
      contactId,
      title: form.title,
      area: form.area,
      stage: form.stage,
      urgency: form.urgency,
      summary: form.summary || null,
      source: 'manual',
      nextActionAt: form.nextActionAt || null,
    });
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation]);

  const editLead = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      let updated;
      commitDemo((current) => ({
        ...current,
        leads: current.leads.map((lead) => {
          if (lead.id !== id) return lead;
          updated = { ...lead, ...patch, updatedAt: new Date().toISOString() };
          return updated;
        }),
      }));
      return updated;
    }
    const response = await updateLegalLead(id, patch);
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation]);

  const addMatter = useCallback((lead) => runMutation(async () => {
    const existing = workspace.matters.find((matter) => matter.leadId === lead.id);
    if (existing) return existing;
    if (demoMode) {
      const now = new Date().toISOString();
      const matter = {
        id: makeLocalId('matter'),
        leadId: lead.id,
        contactId: lead.contactId,
        contact: lead.contact,
        lead: { id: lead.id, title: lead.title, stage: 'CONTRATADO', urgency: lead.urgency },
        title: lead.title,
        area: lead.area,
        status: 'TRIAGEM',
        description: lead.summary,
        openedAt: now,
        createdAt: now,
        updatedAt: now,
        _count: { tasks: 0 },
      };
      commitDemo((current) => ({
        ...current,
        matters: [matter, ...current.matters],
        leads: current.leads.map((item) => item.id === lead.id
          ? { ...item, stage: 'CONTRATADO', matter: { id: matter.id, status: matter.status }, updatedAt: now }
          : item),
      }));
      return matter;
    }
    const response = await createLegalMatter({
      leadId: lead.id,
      title: lead.title,
      area: lead.area,
      status: 'TRIAGEM',
      description: lead.summary || null,
    });
    await updateLegalLead(lead.id, { stage: 'CONTRATADO' });
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation, workspace.matters]);

  const editMatter = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      commitDemo((current) => ({
        ...current,
        matters: current.matters.map((matter) => matter.id === id
          ? { ...matter, ...patch, updatedAt: new Date().toISOString() }
          : matter),
      }));
      return;
    }
    await updateLegalMatter(id, patch);
    await refresh();
  }), [commitDemo, demoMode, refresh, runMutation]);

  const addTask = useCallback((form) => runMutation(async () => {
    if (demoMode) {
      const now = new Date().toISOString();
      const lead = workspace.leads.find((item) => item.id === form.leadId);
      const matter = workspace.matters.find((item) => item.id === form.matterId);
      const task = {
        id: makeLocalId('task'),
        ...form,
        status: 'PENDENTE',
        lead: lead ? { id: lead.id, title: lead.title, stage: lead.stage } : null,
        matter: matter ? { id: matter.id, title: matter.title, status: matter.status } : null,
        createdAt: now,
        updatedAt: now,
      };
      commitDemo((current) => ({ ...current, tasks: [task, ...current.tasks] }));
      return task;
    }
    const response = await createLegalTask(form);
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation, workspace.leads, workspace.matters]);

  const editTask = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      commitDemo((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.id === id
          ? { ...task, ...patch, completedAt: patch.status === 'CONCLUIDA' ? new Date().toISOString() : task.completedAt }
          : task),
      }));
      return;
    }
    await updateLegalTask(id, patch);
    await refresh();
  }), [commitDemo, demoMode, refresh, runMutation]);

  const resetDemo = useCallback(() => {
    if (!demoMode) return;
    const fresh = createDemoWorkspace();
    writeDemoWorkspace(fresh);
    setWorkspace(fresh);
    setError('');
  }, [demoMode]);

  const values = useMemo(() => ({
    ...workspace,
    contacts,
    loading,
    saving,
    error,
    demoMode,
  }), [contacts, demoMode, error, loading, saving, workspace]);

  return {
    ...values,
    addLead,
    editLead,
    addMatter,
    editMatter,
    addTask,
    editTask,
    refresh,
    resetDemo,
  };
}

