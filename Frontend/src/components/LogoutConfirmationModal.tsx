import { useState } from 'react'
import type { AppUser } from '../App'
import { sendLogoutNotification } from '../services/authNotifications'

export default function LogoutConfirmationModal({ user, onCancel, onConfirm }: { user: AppUser; onCancel: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)

  const confirmLogout = async () => {
    setLoading(true)
    await sendLogoutNotification(user)
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center fade-in" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-border shadow-2xl p-6 slide-in">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-primary flex items-center justify-center mb-5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 8l4 4-4 4m4-4H7m3 8H5a2 2 0 01-2-2V6a2 2 0 012-2h5" />
          </svg>
        </div>
        <h2 id="logout-title" className="font-display text-2xl text-primary">Are you sure you want to log out?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">You will be signed out of your account and returned to the login page.</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={onCancel} disabled={loading} className="py-3 rounded-xl border border-border text-sm font-semibold hover:bg-secondary disabled:opacity-50">Cancel</button>
          <button onClick={confirmLogout} disabled={loading} className="py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-60">
            {loading ? 'Signing out...' : 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
