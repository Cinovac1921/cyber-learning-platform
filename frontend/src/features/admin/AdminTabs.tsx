import { NavLink } from 'react-router'

/** Moves between the admin pages. */
export function AdminTabs() {
  return (
    <nav className="subnav" aria-label="Admin sections">
      <NavLink to="/admin" end>
        Users
      </NavLink>
      <NavLink to="/admin/reviews">Review queue</NavLink>
    </nav>
  )
}
