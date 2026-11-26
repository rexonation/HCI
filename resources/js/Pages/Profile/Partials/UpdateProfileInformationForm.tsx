import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation: max 2MB
        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('Profile picture must not exceed 2MB.');
            return;
        }

        // Validate MIME type
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setAvatarError('Please select a valid image file (JPEG, PNG, or WebP).');
            return;
        }

        setAvatarError(null);
        setIsUploadingAvatar(true);

        const formData = new FormData();
        formData.append('avatar', file);

        router.post(route('profile.avatar.update'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setIsUploadingAvatar(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errs) => {
                if (errs.avatar) {
                    setAvatarError(errs.avatar);
                }
            },
        });
    };

    const handleRemoveAvatar = () => {
        if (!confirm('Are you sure you want to remove your profile picture?')) return;
        setIsUploadingAvatar(true);
        router.delete(route('profile.avatar.destroy'), {
            preserveScroll: true,
            onFinish: () => setIsUploadingAvatar(false),
        });
    };

    return (
        <section className={className}>
            {/* Avatar Section */}
            <div className="flex items-center gap-5 p-4 mb-6 rounded-xl border border-border-subtle bg-surface-container-low/50">
                <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-full bg-surface-container text-primary font-bold text-headline-sm flex items-center justify-center border-2 border-border-subtle overflow-hidden shadow-xs">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : 'U'
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-body-md font-semibold text-text-primary">Profile Photo</span>
                        {status === 'avatar-updated' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-badge-completed-text bg-badge-completed-bg px-2 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-xs fill-1">check_circle</span>
                                Updated
                            </span>
                        )}
                        {status === 'avatar-deleted' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-badge-pending-text bg-badge-pending-bg px-2 py-0.5 rounded-full">
                                Reverted to initials
                            </span>
                        )}
                    </div>
                    <p className="text-caption text-text-muted mt-0.5">
                        Upload a personal picture (JPEG, PNG, or WebP up to 2MB).
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />

                    <div className="flex items-center gap-2.5 mt-2.5">
                        <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                            <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                        </button>

                        {user.avatar && (
                            <button
                                type="button"
                                disabled={isUploadingAvatar}
                                onClick={handleRemoveAvatar}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-card hover:bg-rose-50 text-rose-600 border border-border-subtle hover:border-rose-200 rounded-lg text-label-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                                <span>Remove</span>
                            </button>
                        )}
                    </div>

                    {avatarError && (
                        <p className="text-caption text-rose-600 font-medium mt-1.5">{avatarError}</p>
                    )}
                </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label htmlFor="name" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                        Full Name
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">person</span>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoComplete="name"
                            className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                            placeholder="Your full name"
                        />
                    </div>
                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <label htmlFor="email" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                        Email Address
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">mail</span>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                            className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                            placeholder="your@email.com"
                        />
                    </div>
                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="p-3 bg-badge-pending-bg border border-badge-pending-text/20 rounded-lg">
                        <p className="text-body-sm text-badge-pending-text">
                            Your email address is unverified.{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="underline font-semibold hover:text-text-primary transition-colors"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2 text-body-sm font-medium text-badge-completed-text">
                                A new verification link has been sent to your email address.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-label-md font-medium transition-all duration-150 active:scale-[0.98] shadow-sm disabled:opacity-50"
                    >
                        Save Changes
                    </button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <span className="inline-flex items-center gap-1.5 text-body-sm text-badge-completed-text font-medium">
                            <span className="material-symbols-outlined text-base fill-1">check_circle</span>
                            Saved successfully
                        </span>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
