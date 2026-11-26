import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { FormEventHandler, useState } from 'react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);

    const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof e.getModifierState === 'function') {
            setCapsLockActive(e.getModifierState('CapsLock'));
        }
    };

    const hasTypedConfirm = data.password_confirmation.length > 0;
    const passwordsMatch = data.password.length > 0 && data.password === data.password_confirmation;
    const passwordsMismatch = hasTypedConfirm && data.password !== data.password_confirmation;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (passwordsMismatch) {
            return;
        }

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="New Password" />

                    <div className="relative mt-1">
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pr-10"
                            autoComplete="new-password"
                            isFocused={true}
                            onChange={(e) => setData('password', e.target.value)}
                            onKeyDown={handleKeyActivity}
                            onKeyUp={handleKeyActivity}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                            tabIndex={-1}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                        </button>
                    </div>

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirm Password"
                        />
                        {passwordsMismatch && (
                            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                Does not match
                            </span>
                        )}
                        {passwordsMatch && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Matches
                            </span>
                        )}
                    </div>

                    <div className="relative mt-1">
                        <TextInput
                            id="password_confirmation"
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className={`block w-full pr-16 ${
                                passwordsMismatch
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                                    : passwordsMatch
                                    ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
                                    : ''
                            }`}
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            onKeyDown={handleKeyActivity}
                            onKeyUp={handleKeyActivity}
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                            {passwordsMismatch && (
                                <span className="material-symbols-outlined text-[18px] text-rose-500">
                                    error
                                </span>
                            )}
                            {passwordsMatch && (
                                <span className="material-symbols-outlined text-[18px] text-emerald-600">
                                    check_circle
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="p-1 text-text-muted hover:text-text-primary focus:outline-none"
                                tabIndex={-1}
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {passwordsMismatch && (
                        <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined text-[15px]">info</span>
                            Passwords do not match.
                        </p>
                    )}

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                {capsLockActive && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">keyboard_capslock</span>
                        <span className="font-medium">Caps Lock is ON</span>
                    </div>
                )}

                <div className="mt-6 flex items-center justify-end">
                    <PrimaryButton disabled={processing || passwordsMismatch}>
                        Reset Password
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
