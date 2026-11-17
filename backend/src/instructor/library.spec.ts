import { LIBRARY_COURSE, LIVE_PUBLIC_COURSE, TEMPLATE_COURSE } from './library';

describe('the library rules', () => {
  it('has exactly two pools: ready templates and live public courses', () => {
    expect(TEMPLATE_COURSE).toEqual({ scope: 'TEMPLATE', published: true });
    expect(LIVE_PUBLIC_COURSE).toEqual({ scope: 'PUBLIC', published: true, reviewStatus: 'APPROVED' });
    expect(LIBRARY_COURSE).toEqual({ OR: [TEMPLATE_COURSE, LIVE_PUBLIC_COURSE] });
  });

  it('never includes classroom courses or unreviewed public courses', () => {
    const rules = JSON.stringify(LIBRARY_COURSE);
    expect(rules).not.toContain('CLASSROOM');
    expect(rules).not.toContain('PENDING');
    expect(rules).not.toContain('REJECTED');
    expect(rules).not.toContain('NONE');
  });
});
