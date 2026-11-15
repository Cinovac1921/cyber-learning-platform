import { useState, type FormEvent } from 'react'
import { changeUserRole, listUsers } from '../../api/admin'
import { ApiError } from '../../api/client'
import { useReloadableResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { AdminUser } from '../../types/admin'
import type { Role } from '../../types/api'
import { ROLE_LABEL, ROLE_OPTIONS } from '../auth/roles'
import { AdminTabs } from './AdminTabs'
import { useAuth } from '../auth/useAuth'

function UserRow({ user, isMe, onSaved }: { user: AdminUser; isMe: boolean; onSaved: () => void }) {
  const [draft, setDraft] = useState<Role>(user.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changed = draft !== user.role

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await changeUserRole(user.id, draft)
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className={isMe ? 'is-me' : undefined}>
      <td>
        {user.displayName}
        {isMe && <span className="chip chip--live">You</span>}
      </td>
      <td>{user.email}</td>
      <td>
        <div className="role-picker">
          <select
            aria-label={`Role for ${user.displayName}`}
            value={draft}
            disabled={isMe || saving}
            onChange={(event) => setDraft(event.target.value as Role)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          {changed && (
            <button type="button" className="button button--small" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  )
}

export function AdminUsersPage() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const { resource: users, reload } = useReloadableResource(`admin-users:${term}`, (signal) =>
    listUsers(term, signal),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    setTerm(search.trim())
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Choose who is a student, an instructor or an admin. You can't change your own role."
      />

      <AdminTabs />

      <form className="admin-search" role="search" onSubmit={submit}>
        <input
          type="search"
          aria-label="Search by name or email"
          placeholder="Search by name or email"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>

      {users.status === 'loading' && (
        <p className="loading" role="status">
          Loading users…
        </p>
      )}

      {users.status === 'error' && <ErrorNotice error={users.error} />}

      {users.status === 'ready' && users.data.length === 0 && (
        <EmptyState title="No users found">Try a different name or email.</EmptyState>
      )}

      {users.status === 'ready' && users.data.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Users and their roles</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((row) => (
                <UserRow key={`${row.id}:${row.role}`} user={row} isMe={row.id === me?.id} onSaved={reload} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
