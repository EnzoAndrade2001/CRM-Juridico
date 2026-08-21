import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createLegalClient,
  createLegalLead,
  createLegalMatter,
  createLegalTask,
  getLegalClient,
  getLegalClients,
  getLegalLead,
  getLegalLeads,
  getLegalMatter,
  getLegalMatters,
  getLegalSummary,
  getLegalTasks,
  updateLegalClient,
  updateLegalLead,
  updateLegalMatter,
  updateLegalTask,
} from '../../services/api';
import { createDemoWorkspace, makeLocalId, readDemoWorkspace, writeDemoWorkspace } from './legalWorkspace';

function apiErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Não foi possível concluir a operação.';
}

function activity(entityType, entityId, type, payload = {}) {
  return {
    id: makeLocalId('activity'), entityType, entityId, type, payload,
    actor: { name: 'Eduarda Andrade' }, createdAt: new Date().toISOString(),
  };
}

function buildDemoSummary(workspace) {
  const leadsByStage = workspace.leads.reduce((result, lead) => ({
    ...result, [lead.stage]: (result[lead.stage] || 0) + 1,
  }), {});
  const mattersByStatus = workspace.matters.reduce((result, matter) => ({
    ...result, [matter.status]: (result[matter.status] || 0) + 1,
  }), {});
  const now = Date.now();
  const openTasks = workspace.tasks.filter((task) => ['PENDENTE', 'EM_ANDAMENTO'].includes(task.status));
  return {
    leadsByStage,
    mattersByStatus,
    tasks: {
      open: openTasks.length,
      overdue: openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now).length,
    },
    recentActivities: [...(workspace.activities || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10),
  };
}

export default function useLegalWorkspace({ demoMode }) {
  const [workspace, setWorkspace] = useState(() => (demoMode ? readDemoWorkspace() : {
    leads: [], contacts: [], matters: [], tasks: [], activities: [],
  }));
  const [summary, setSummary] = useState(null);
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
      const [leadsResponse, mattersResponse, tasksResponse, contactsResponse, summaryResponse] = await Promise.all([
        getLegalLeads({ limit: 100 }),
        getLegalMatters({ limit: 100 }),
        getLegalTasks({ limit: 100 }),
        getLegalClients({ limit: 100 }),
        getLegalSummary(),
      ]);
      setWorkspace({
        leads: leadsResponse.data.items,
        contacts: contactsResponse.data.items,
        matters: mattersResponse.data.items,
        tasks: tasksResponse.data.items,
        activities: summaryResponse.data.recentActivities || [],
      });
      setSummary(summaryResponse.data);
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

  const addClient = useCallback((form) => runMutation(async () => {
    if (demoMode) {
      const contact = {
        id: makeLocalId('contact'), name: form.name, phone: form.phone, email: form.email || null,
        cpfCnpj: form.cpfCnpj || null, city: form.city || null, state: form.state || null,
        notes: form.notes || null, instanceId: null, createdAt: new Date().toISOString(),
      };
      commitDemo((current) => ({ ...current, contacts: [contact, ...(current.contacts || [])] }));
      return contact;
    }
    const response = await createLegalClient(form);
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation]);

  const editClient = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      commitDemo((current) => ({
        ...current,
        contacts: current.contacts.map((contact) => contact.id === id ? { ...contact, ...patch } : contact),
        leads: current.leads.map((lead) => lead.contactId === id ? { ...lead, contact: { ...lead.contact, ...patch } } : lead),
        matters: current.matters.map((matter) => matter.contactId === id ? { ...matter, contact: { ...matter.contact, ...patch } } : matter),
      }));
      return;
    }
    await updateLegalClient(id, patch);
    await refresh();
  }), [commitDemo, demoMode, refresh, runMutation]);

  const addLead = useCallback((form) => runMutation(async () => {
    if (demoMode) {
      let contact = workspace.contacts.find((item) => item.id === form.contactId);
      if (!contact) {
        contact = {
          id: makeLocalId('contact'), name: form.clientName, phone: form.phone, email: form.email || null,
          createdAt: new Date().toISOString(), instanceId: null,
        };
      }
      const now = new Date().toISOString();
      const lead = {
        id: makeLocalId('lead'), contactId: contact.id, contact, title: form.title, area: form.area,
        stage: form.stage || 'NOVO_CONTATO', urgency: form.urgency || 'MEDIA', summary: form.summary || null,
        source: 'manual', nextActionAt: form.nextActionAt || null, createdAt: now, updatedAt: now, _count: { tasks: 0 },
      };
      commitDemo((current) => ({
        ...current,
        contacts: current.contacts.some((item) => item.id === contact.id) ? current.contacts : [contact, ...current.contacts],
        leads: [lead, ...current.leads],
        activities: [activity('lead', lead.id, 'lead.created', { stage: lead.stage, area: lead.area }), ...(current.activities || [])],
      }));
      return lead;
    }
    let contactId = form.contactId;
    if (!contactId) {
      const contactResponse = await createLegalClient({ name: form.clientName, phone: form.phone, email: form.email || null });
      contactId = contactResponse.data.id;
    }
    const response = await createLegalLead({
      contactId, title: form.title, area: form.area, stage: form.stage, urgency: form.urgency,
      summary: form.summary || null, source: form.source || 'manual', ticketId: form.ticketId || null,
      nextActionAt: form.nextActionAt || null,
    });
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation, workspace.contacts]);

  const editLead = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      let updated;
      commitDemo((current) => {
        const existing = current.leads.find((lead) => lead.id === id);
        updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        return {
          ...current,
          leads: current.leads.map((lead) => lead.id === id ? updated : lead),
          activities: [activity('lead', id, 'lead.updated', { fromStage: existing.stage, toStage: updated.stage }), ...(current.activities || [])],
        };
      });
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
        id: makeLocalId('matter'), leadId: lead.id, contactId: lead.contactId, contact: lead.contact,
        lead: { id: lead.id, title: lead.title, stage: 'CONTRATADO', urgency: lead.urgency }, title: lead.title,
        area: lead.area, status: 'TRIAGEM', description: lead.summary, openedAt: now, createdAt: now,
        updatedAt: now, _count: { tasks: 0 },
      };
      commitDemo((current) => ({
        ...current,
        matters: [matter, ...current.matters],
        leads: current.leads.map((item) => item.id === lead.id
          ? { ...item, stage: 'CONTRATADO', matter: { id: matter.id, status: matter.status }, updatedAt: now }
          : item),
        activities: [
          activity('matter', matter.id, 'matter.created', { status: matter.status, area: matter.area }),
          activity('lead', lead.id, 'lead.updated', { fromStage: lead.stage, toStage: 'CONTRATADO' }),
          ...(current.activities || []),
        ],
      }));
      return matter;
    }
    const response = await createLegalMatter({
      leadId: lead.id, title: lead.title, area: lead.area, status: 'TRIAGEM', description: lead.summary || null,
    });
    await updateLegalLead(lead.id, { stage: 'CONTRATADO' });
    await refresh();
    return response.data;
  }), [commitDemo, demoMode, refresh, runMutation, workspace.matters]);

  const editMatter = useCallback((id, patch) => runMutation(async () => {
    if (demoMode) {
      commitDemo((current) => {
        const existing = current.matters.find((matter) => matter.id === id);
        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        return {
          ...current,
          matters: current.matters.map((matter) => matter.id === id ? updated : matter),
          activities: [activity('matter', id, 'matter.updated', { fromStatus: existing.status, toStatus: updated.status }), ...(current.activities || [])],
        };
      });
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
        id: makeLocalId('task'), ...form, status: 'PENDENTE',
        lead: lead ? { id: lead.id, title: lead.title, stage: lead.stage } : null,
        matter: matter ? { id: matter.id, title: matter.title, status: matter.status } : null,
        createdAt: now, updatedAt: now,
      };
      commitDemo((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
        activities: [activity('task', task.id, 'task.created', { type: task.type, priority: task.priority }), ...(current.activities || [])],
      }));
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
        activities: [activity('task', id, 'task.updated', { toStatus: patch.status }), ...(current.activities || [])],
      }));
      return;
    }
    await updateLegalTask(id, patch);
    await refresh();
  }), [commitDemo, demoMode, refresh, runMutation]);

  const loadLeadDetail = useCallback(async (id) => {
    if (demoMode) {
      const lead = workspace.leads.find((item) => item.id === id);
      return {
        ...lead,
        tasks: workspace.tasks.filter((task) => task.leadId === id),
        activities: workspace.activities.filter((item) => item.entityType === 'lead' && item.entityId === id),
      };
    }
    const response = await getLegalLead(id);
    return response.data;
  }, [demoMode, workspace.activities, workspace.leads, workspace.tasks]);

  const loadClientDetail = useCallback(async (id) => {
    if (demoMode) {
      const client = workspace.contacts.find((item) => item.id === id);
      const leads = workspace.leads.filter((lead) => lead.contactId === id);
      const matters = workspace.matters.filter((matter) => matter.contactId === id);
      const leadIds = new Set(leads.map((lead) => lead.id));
      const matterIds = new Set(matters.map((matter) => matter.id));
      return {
        ...client,
        leads,
        matters,
        tasks: workspace.tasks.filter((task) => leadIds.has(task.leadId) || matterIds.has(task.matterId)),
        tickets: [],
        activities: workspace.activities.filter((item) => item.entityType === 'client' && item.entityId === id),
      };
    }
    const response = await getLegalClient(id);
    return response.data;
  }, [demoMode, workspace.activities, workspace.contacts, workspace.leads, workspace.matters, workspace.tasks]);

  const loadMatterDetail = useCallback(async (id) => {
    if (demoMode) {
      const matter = workspace.matters.find((item) => item.id === id);
      return {
        ...matter,
        tasks: workspace.tasks.filter((task) => task.matterId === id),
        activities: workspace.activities.filter((item) => item.entityType === 'matter' && item.entityId === id),
      };
    }
    const response = await getLegalMatter(id);
    return response.data;
  }, [demoMode, workspace.activities, workspace.matters, workspace.tasks]);

  const resetDemo = useCallback(() => {
    if (!demoMode) return;
    const fresh = createDemoWorkspace();
    writeDemoWorkspace(fresh);
    setWorkspace(fresh);
    setError('');
  }, [demoMode]);

  const effectiveSummary = useMemo(
    () => (demoMode ? buildDemoSummary(workspace) : summary || buildEmptySummary()),
    [demoMode, summary, workspace],
  );

  return {
    ...workspace,
    summary: effectiveSummary,
    loading, saving, error, demoMode,
    addClient, editClient, addLead, editLead, addMatter, editMatter, addTask, editTask,
    loadClientDetail, loadLeadDetail, loadMatterDetail, refresh, resetDemo,
  };
}

function buildEmptySummary() {
  return {
    leadsByStage: {},
    mattersByStatus: {},
    tasks: { open: 0, overdue: 0 },
    recentActivities: [],
  };
}
