import os
from pathlib import Path

import firebirdsql
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name('.env'))

try:
    conn = firebirdsql.connect(
        host=os.getenv('FIREBIRD_HOST', '127.0.0.1'),
        database=os.getenv('FIREBIRD_DATABASE', ''),
        user=os.getenv('FIREBIRD_USER', 'SYSDBA'),
        password=os.getenv('FIREBIRD_PASSWORD', ''),
        port=int(os.getenv('FIREBIRD_PORT', '3050')),
        charset=os.getenv('FIREBIRD_CHARSET', 'WIN1252'),
    )
    cur = conn.cursor()
    cur.execute('select first 5 * from IXLOSDEFEITOTP')
    for row in cur.fetchall():
        print(row)
    conn.close()
except Exception as e:
    print('Error:', e)
