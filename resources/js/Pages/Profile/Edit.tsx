import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const auth = (usePage().props as any)?.auth;
    const user = auth?.user || { name: 'User', email: '' };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <span className="text-body-md font-body-md text-text-muted">Taskora</span>
                    <span className="text-caption font-caption text-text-muted">/</span>
                    <span className="text-label-md font-label-md font-semibold text-text-primary">Profile</span>
                </div>
            }
        >
            <Head title="Profile — Taskora" />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight font-bold">Profile</h1>
                    <p className="text-body-md font-body-md text-text-muted mt-1">Manage your account information and security settings.</p>
                </div>
                {/* User Avatar Badge */}
                <div className="flex items-center gap-3 bg-surface-card border border-border-subtle rounded-full px-4 py-2 shadow-sm">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary text-label-md font-label-md font-bold shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-label-sm font-label-sm font-semibold text-text-primary">{user.name}</span>
                        <span className="text-caption font-caption text-text-muted">{user.email}</span>
                    </div>
                </div>
            </div>

            {/* Profile Information Card */}
            <div className="bg-surface-card border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-surface-container-low/50">
                    <div className="p-2 rounded-lg bg-surface-card border border-border-subtle text-primary">
                        <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <div>
                        <h2 className="text-title-sm font-title-sm text-text-primary font-bold">Profile Information</h2>
                        <p className="text-caption font-caption text-text-muted">Update your display name and email address.</p>
                    </div>
                </div>
                <div className="p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>
            </div>

            {/* Update Password Card */}
            <div className="bg-surface-card border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-surface-container-low/50">
                    <div className="p-2 rounded-lg bg-surface-card border border-border-subtle text-primary">
                        <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                    <div>
                        <h2 className="text-title-sm font-title-sm text-text-primary font-bold">Update Password</h2>
                        <p className="text-caption font-caption text-text-muted">Use a strong, unique password to keep your account secure.</p>
                    </div>
                </div>
                <div className="p-6">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>
            </div>

            {/* Danger Zone Card */}
            <div className="bg-surface-card border border-error/30 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-error/20 bg-error-container/10">
                    <div className="p-2 rounded-lg bg-surface-card border border-error/30 text-error">
                        <span className="material-symbols-outlined text-xl">warning</span>
                    </div>
                    <div>
                        <h2 className="text-title-sm font-title-sm text-error font-bold">Danger Zone</h2>
                        <p className="text-caption font-caption text-text-muted">Irreversible and destructive actions.</p>
                    </div>
                </div>
                <div className="p-6">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
