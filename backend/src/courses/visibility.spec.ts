import { courseVisibleTo, PUBLIC_COURSE } from './visibility';

describe('courseVisibleTo', () => {
  it('allows public courses, and classroom courses only for the classroom\'s members and owner', () => {
    expect(courseVisibleTo(7)).toEqual({
      published: true,
      OR: [
        { scope: 'PUBLIC', reviewStatus: 'APPROVED' },
        {
          scope: 'CLASSROOM',
          classroom: { OR: [{ ownerId: 7 }, { members: { some: { userId: 7 } } }] },
        },
      ],
    });
  });

  it('never lets an unreviewed public course through', () => {
    expect(PUBLIC_COURSE).toEqual({ published: true, scope: 'PUBLIC', reviewStatus: 'APPROVED' });
    expect(JSON.stringify(courseVisibleTo(7))).toContain('APPROVED');
    expect(JSON.stringify(courseVisibleTo(7))).not.toContain('PENDING');
  });

  it('never includes templates', () => {
    expect(JSON.stringify(courseVisibleTo(7))).not.toContain('TEMPLATE');
  });

  it('is built from the given person, so two people never share a filter', () => {
    expect(JSON.stringify(courseVisibleTo(7))).not.toEqual(JSON.stringify(courseVisibleTo(8)));
  });
});
