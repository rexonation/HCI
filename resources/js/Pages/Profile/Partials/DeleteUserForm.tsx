import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

export default function DeleteUserForm({
    className = '',
}: {
    className?: string;
}) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-4 ${className}`}>
            <p className="text-body-sm text-text-muted leading-relaxed">
                Once your account is deleted, all of your tasks, progress, and personal data will be permanently wiped. This action cannot be reversed.
            </p>

            <button
                type="button"
                onClick={confirmUserDeletion}
                className="h-10 px-5 bg-error hover:bg-red-700 text-white rounded-lg text-label-md font-label-md font-medium transition-all duration-150 active:scale-[0.98] shadow-sm flex items-center gap-2"
            >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                <span>Delete Account</span>
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <div className="flex items-center gap-3 text-error mb-4">
                        <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div>
                            <h2 className="text-title-md font-title-md font-bold text-text-primary">
                                Are you sure you want to delete your account?
                            </h2>
                            <p className="text-caption font-caption text-text-muted">
                                This will permanently remove your account and all associated tasks.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label htmlFor="delete-password" className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                            Please enter your password to confirm
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">lock</span>
                            <input
                                id="delete-password"
                                type="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full h-11 pl-10 pr-4 text-body-md bg-bg-canvas border border-border-subtle focus:border-error focus:ring-2 focus:ring-error/20 rounded-lg text-text-primary placeholder:text-text-muted transition-all"
                                placeholder="Your current password"
                            />
                        </div>
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={processing}
                            className="h-10 px-5 bg-error hover:bg-red-700 text-white rounded-lg text-label-md font-medium transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                            <span>Confirm Deletion</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
