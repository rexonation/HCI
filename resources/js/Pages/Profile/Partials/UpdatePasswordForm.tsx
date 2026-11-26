import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <form onSubmit={updatePassword} className="space-y-5">
                <div>
                    <label htmlFor="current_password" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                        Current Password
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">lock</span>
                        <input
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            type="password"
                            autoComplete="current-password"
                            className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                            placeholder="Enter current password"
                        />
                    </div>
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>

                <div>
                    <label htmlFor="password" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                        New Password
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">key</span>
                        <input
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type="password"
                            autoComplete="new-password"
                            className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                            placeholder="Enter new password"
                        />
                    </div>
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div>
                    <label htmlFor="password_confirmation" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">verified_user</span>
                        <input
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            type="password"
                            autoComplete="new-password"
                            className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                            placeholder="Re-enter new password"
                        />
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-label-md font-medium transition-all duration-150 active:scale-[0.98] shadow-sm disabled:opacity-50"
                    >
                        Update Password
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
                            Password updated
                        </span>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
