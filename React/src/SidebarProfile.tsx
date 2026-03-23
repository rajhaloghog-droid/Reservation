import type { ChangeEvent } from 'react'
import type { AuthSession } from './appSession'

export default function SidebarProfile({
  session,
  profileImage,
  onProfileImageUpload,
  onRemoveProfileImage,
}: {
  session: AuthSession
  profileImage: string | null
  onProfileImageUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveProfileImage: () => void
}) {
  return (
    <div className="sidebar-profile">
      <div className="sidebar-avatar">
        {profileImage ? (
          <img src={profileImage} alt={`${session.user.email} profile`} />
        ) : (
          <span>{session.user.email.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="sidebar-profile-meta">
        <p className="sidebar-profile-name">{session.user.email}</p>
        <p className="sidebar-profile-role">
          {session.user.role === 'admin' ? 'Administrator' : 'User'}
        </p>
      </div>
      <label className="sidebar-upload-label">
        Upload Photo
        <input type="file" accept="image/*" onChange={onProfileImageUpload} />
      </label>
      {profileImage && (
        <button type="button" className="sidebar-remove-photo-btn" onClick={onRemoveProfileImage}>
          Remove Photo
        </button>
      )}
    </div>
  )
}
