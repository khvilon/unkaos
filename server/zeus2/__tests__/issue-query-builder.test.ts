import { buildIssuesListQuery } from '../utils/issue-query-builder';

describe('issue-query-builder', () => {
  it('должен переписывать алиас в ORDER BY с I.* на T1.* (чтобы не было 500 из-за missing FROM-clause)', () => {
    const sql = buildIssuesListQuery(
      'test2',
      { whereClause: ' TRUE ', orderByClause: 'ORDER BY I.created_at DESC' },
      { limit: 10, offset: 0 }
    );

    expect(sql).toContain('ORDER BY T1.created_at DESC');
    expect(sql).not.toContain('ORDER BY I.created_at');
  });

  it('должен переписывать алиас во всех полях ORDER BY', () => {
    const sql = buildIssuesListQuery(
      'test2',
      { whereClause: ' TRUE ', orderByClause: 'ORDER BY I.created_at DESC, I.updated_at ASC' },
      { limit: 10, offset: 0 }
    );

    expect(sql).toContain('ORDER BY T1.created_at DESC, T1.updated_at ASC');
    expect(sql).not.toContain('ORDER BY I.created_at');
    expect(sql).not.toContain('I.updated_at');
  });
});


