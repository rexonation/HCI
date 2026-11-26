import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { FormEventHandler, useState } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        terms: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);

    // Caps Lock detector
    const handleKeyActivity = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof e.getModifierState === 'function') {
            setCapsLockActive(e.getModifierState('CapsLock'));
        }
    };

    // Password requirements checks
    const hasMinLength = data.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(data.password);
    const hasNumber = /[0-9]/.test(data.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(data.password);

    // Compute password strength score (0 to 4)
    const getPasswordStrength = () => {
        if (!data.password) return 0;
        let score = 0;
        if (hasMinLength) score++;
        if (hasUppercase) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;
        return score;
    };

    const strength = getPasswordStrength();

    const strengthLabel = [
        { text: 'Too short', color: 'text-text-muted', barColor: 'bg-border-subtle' },
        { text: 'Weak', color: 'text-rose-600', barColor: 'bg-rose-500' },
        { text: 'Fair', color: 'text-amber-600', barColor: 'bg-amber-500' },
        { text: 'Good', color: 'text-blue-600', barColor: 'bg-blue-500' },
        { text: 'Strong', color: 'text-emerald-600', barColor: 'bg-emerald-500' },
    ][strength];

    // Password confirmation match logic
    const hasTypedConfirm = data.password_confirmation.length > 0;
    const passwordsMatch = data.password.length > 0 && data.password === data.password_confirmation;
    const passwordsMismatch = hasTypedConfirm && data.password !== data.password_confirmation;

    // Email validation
    const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const showEmailWarning = emailTouched && data.email.length > 0 && !isValidEmail(data.email);

    // Form can submit only if valid
    const canSubmit =
        data.name.trim().length > 0 &&
        data.email.trim().length > 0 &&
        isValidEmail(data.email) &&
        hasMinLength &&
        passwordsMatch &&
        data.terms &&
        !processing;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (passwordsMismatch) {
            return;
        }

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="bg-bg-canvas text-text-primary min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-fixed selection:text-primary">
            <Head title="Create your account — Taskora" />

            {/* Header Navigation */}
            <header className="w-full bg-surface-card border-b border-border-subtle shadow-sm sticky top-0 z-50">
                <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto w-full">
                    <Link
                        href="/"
                        className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary-container rounded-lg p-1"
                    >
                        <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:bg-accent-hover transition-colors">
                            <span className="material-symbols-outlined fill-1">check_circle</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-title-sm font-title-sm font-bold text-text-primary tracking-tight">
                                Taskora
                            </span>
                            <span className="text-caption font-caption text-text-muted">Task Management</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <a
                            href="#help"
                            className="flex items-center gap-1.5 text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-surface-container-low"
                        >
                            <span className="material-symbols-outlined text-[18px]">help_outline</span>
                            <span>
                                Need assistance? <strong className="font-label-md text-primary">Help Center</strong>
                            </span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content Canvas */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center">
                <div className="w-full max-w-lg bg-surface-card border border-border-subtle rounded-xl p-6 sm:p-8 card-shadow">
                    
                    {/* Card Header */}
                    <div className="mb-6">
                        <h2 className="text-headline-lg font-headline-lg text-text-primary tracking-tight font-bold">
                            Create your account
                        </h2>
                        <p className="text-body-md font-body-md text-text-muted mt-1">
                            Get started with Taskora for free today.
                        </p>
                    </div>

                    {/* Registration Form */}
                    <form className="space-y-4" onSubmit={submit} noValidate>
                        {/* Full Name */}
                        <div>
                            <label className="block text-label-md font-label-md text-text-primary mb-1.5" htmlFor="name">
                                Full Name
                            </label>
                            <div className="relative">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Alex Morgan"
                                    required
                                    autoComplete="name"
                                    className="w-full h-11 px-3.5 pr-10 bg-surface-card border border-border-subtle rounded-lg text-text-primary text-body-md font-body-md placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent transition-all"
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-muted">
                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                </div>
                            </div>
                            <InputError message={errors.name} />
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="block text-label-md font-label-md text-text-primary mb-1.5" htmlFor="email">
                                Email address
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onBlur={() => setEmailTouched(true)}
                                    placeholder="alex.morgan@example.com"
                                    required
                                    autoComplete="email"
                                    className={`w-full h-11 px-3.5 pr-10 bg-surface-card border rounded-lg text-text-primary text-body-md font-body-md placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                                        showEmailWarning
                                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                                            : emailTouched && isValidEmail(data.email)
                                            ? 'border-emerald-500 focus:ring-emerald-500'
                                            : 'border-border-subtle focus:ring-primary-container focus:border-transparent'
                                    }`}
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    {emailTouched && isValidEmail(data.email) ? (
                                        <span className="material-symbols-outlined text-[18px] text-emerald-600 fill-1">
                                            check_circle
                                        </span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px] text-text-muted">
                                            mail
                                        </span>
                                    )}
                                </div>
                            </div>
                            {showEmailWarning && (
                                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                                    <span className="material-symbols-outlined text-[15px]">info</span>
                                    Please enter a valid email address (e.g. name@domain.com)
                                </p>
                            )}
                            <InputError message={errors.email} />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-label-md font-label-md text-text-primary" htmlFor="password">
                                    Password
                                </label>
                                {data.password && (
                                    <span className={`text-caption font-caption font-semibold flex items-center gap-1.5 ${strengthLabel.color}`}>
                                        <span className={`w-2 h-2 rounded-full ${strengthLabel.barColor}`}></span>
                                        {strengthLabel.text}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    onKeyDown={handleKeyActivity}
                                    onKeyUp={handleKeyActivity}
                                    placeholder="••••••••••••"
                                    required
                                    autoComplete="new-password"
                                    className={`w-full h-11 px-3.5 pr-10 bg-surface-card border rounded-lg text-text-primary text-body-md font-body-md placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                                        hasMinLength
                                            ? 'border-border-subtle focus:ring-primary-container'
                                            : data.password.length > 0
                                            ? 'border-amber-300 focus:ring-amber-400'
                                            : 'border-border-subtle focus:ring-primary-container'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                                    aria-label="Toggle password visibility"
                                    tabIndex={-1}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>

                            {/* Password Strength Progress Bars */}
                            {data.password.length > 0 && (
                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                    <div className={`h-1.5 rounded-full transition-all duration-300 ${strength >= 1 ? strengthLabel.barColor : 'bg-border-subtle'}`}></div>
                                    <div className={`h-1.5 rounded-full transition-all duration-300 ${strength >= 2 ? strengthLabel.barColor : 'bg-border-subtle'}`}></div>
                                    <div className={`h-1.5 rounded-full transition-all duration-300 ${strength >= 3 ? strengthLabel.barColor : 'bg-border-subtle'}`}></div>
                                    <div className={`h-1.5 rounded-full transition-all duration-300 ${strength >= 4 ? strengthLabel.barColor : 'bg-border-subtle'}`}></div>
                                </div>
                            )}

                            {/* Live Password Criteria Pills */}
                            {data.password.length > 0 && (
                                <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-border-subtle/60 text-[11px]">
                                    <div className={`flex items-center gap-1 font-medium transition-colors ${hasMinLength ? 'text-emerald-700' : 'text-text-muted'}`}>
                                        <span className={`material-symbols-outlined text-[15px] ${hasMinLength ? 'text-emerald-600 fill-1' : 'text-text-muted'}`}>
                                            {hasMinLength ? 'check_circle' : 'circle'}
                                        </span>
                                        <span>8+ chars</span>
                                    </div>
                                    <div className={`flex items-center gap-1 font-medium transition-colors ${hasUppercase ? 'text-emerald-700' : 'text-text-muted'}`}>
                                        <span className={`material-symbols-outlined text-[15px] ${hasUppercase ? 'text-emerald-600 fill-1' : 'text-text-muted'}`}>
                                            {hasUppercase ? 'check_circle' : 'circle'}
                                        </span>
                                        <span>Uppercase (A-Z)</span>
                                    </div>
                                    <div className={`flex items-center gap-1 font-medium transition-colors ${hasNumber || hasSpecial ? 'text-emerald-700' : 'text-text-muted'}`}>
                                        <span className={`material-symbols-outlined text-[15px] ${hasNumber || hasSpecial ? 'text-emerald-600 fill-1' : 'text-text-muted'}`}>
                                            {hasNumber || hasSpecial ? 'check_circle' : 'circle'}
                                        </span>
                                        <span>Number/Symbol</span>
                                    </div>
                                </div>
                            )}

                            <InputError message={errors.password} />
                        </div>

                        {/* Confirm Password with Live Real-time Match Validation */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    className="block text-label-md font-label-md text-text-primary"
                                    htmlFor="password_confirmation"
                                >
                                    Confirm Password
                                </label>
                                {passwordsMismatch && (
                                    <span className="text-caption font-caption text-rose-600 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                        Does not match
                                    </span>
                                )}
                                {passwordsMatch && (
                                    <span className="text-caption font-caption text-emerald-600 font-semibold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px] fill-1">check_circle</span>
                                        Matches
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    onKeyDown={handleKeyActivity}
                                    onKeyUp={handleKeyActivity}
                                    placeholder="••••••••••••"
                                    required
                                    autoComplete="new-password"
                                    className={`w-full h-11 px-3.5 pr-20 bg-surface-card border rounded-lg text-text-primary text-body-md font-body-md placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all ${
                                        passwordsMismatch
                                            ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20 text-rose-900'
                                            : passwordsMatch
                                            ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                                            : 'border-border-subtle focus:ring-primary-container focus:border-transparent'
                                    }`}
                                />
                                
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                                    {/* Match / Mismatch status icon */}
                                    {passwordsMismatch && (
                                        <span className="material-symbols-outlined text-[18px] text-rose-500 animate-pulse" title="Passwords do not match">
                                            error
                                        </span>
                                    )}
                                    {passwordsMatch && (
                                        <span className="material-symbols-outlined text-[18px] text-emerald-600 fill-1" title="Passwords match">
                                            check_circle
                                        </span>
                                    )}

                                    {/* Visibility Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="p-1 text-text-muted hover:text-text-primary focus:outline-none"
                                        aria-label="Toggle confirm password visibility"
                                        tabIndex={-1}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Clear contextual warning / success message */}
                            {passwordsMismatch && (
                                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5 bg-rose-50 border border-rose-200/70 px-2.5 py-1.5 rounded-md">
                                    <span className="material-symbols-outlined text-[16px] text-rose-500">cancel</span>
                                    <span>Passwords do not match. Please re-enter your password carefully.</span>
                                </div>
                            )}

                            {passwordsMatch && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-1.5 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1.5 rounded-md">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600 fill-1">verified</span>
                                    <span>Passwords match perfectly! Ready to proceed.</span>
                                </div>
                            )}

                            <InputError message={errors.password_confirmation} />
                        </div>

                        {/* Caps Lock Indicator Warning */}
                        {capsLockActive && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg">
                                <span className="material-symbols-outlined text-[16px] text-amber-600">keyboard_capslock</span>
                                <span className="font-medium">Caps Lock is turned ON — this may cause password mismatch.</span>
                            </div>
                        )}

                        {/* Agreement Checkbox */}
                        <div className="pt-1">
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.terms}
                                    onChange={(e) => setData('terms', e.target.checked)}
                                    required
                                    className="w-5 h-5 rounded border-border-hover text-primary-container focus:ring-primary-container focus:ring-offset-0 transition-colors mt-0.5 cursor-pointer"
                                />
                                <span className="text-body-sm font-body-sm text-text-muted leading-tight">
                                    I agree to the{' '}
                                    <a href="#terms" className="text-primary hover:underline font-medium">
                                        Terms of Service
                                    </a>{' '}
                                    and{' '}
                                    <a href="#privacy" className="text-primary hover:underline font-medium">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>
                        </div>

                        {/* Submit Button with Disabled Protection & Loading Spinner */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing || passwordsMismatch}
                                className={`w-full h-11 px-5 rounded-lg text-on-primary text-label-md font-label-md font-semibold flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 ${
                                    passwordsMismatch
                                        ? 'bg-slate-400 cursor-not-allowed opacity-75'
                                        : 'bg-primary-container hover:bg-accent-hover active:scale-[0.98]'
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                {processing ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Create Account</span>
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </>
                                )}
                            </button>

                            {/* Helper hint when passwords mismatch */}
                            {passwordsMismatch && (
                                <p className="text-center text-xs text-rose-600 font-medium mt-1.5 flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                                    Please fix password mismatch above before continuing
                                </p>
                            )}
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border-subtle"></div>
                        </div>
                        <div className="relative flex justify-center text-caption font-caption">
                            <span className="px-3 bg-surface-card text-text-muted uppercase tracking-wider font-semibold">
                                OR
                            </span>
                        </div>
                    </div>

                    {/* Secondary Action: Login */}
                    <div>
                        <Link
                            href={route('login')}
                            className="w-full h-11 px-5 rounded-lg border border-border-subtle bg-surface-card text-text-primary text-label-md font-label-md font-medium flex items-center justify-center gap-2 hover:bg-bg-canvas hover:border-border-hover active:scale-[0.98] transition-all"
                        >
                            <span>
                                Already have an account? <strong className="text-primary font-semibold">Log In</strong>
                            </span>
                        </Link>
                    </div>

                    {/* Trust Security Badge */}
                    <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-center gap-2 text-caption font-caption text-text-muted text-center">
                        <span className="material-symbols-outlined text-[15px] text-text-muted">lock</span>
                        <span>Protected by encrypted sessions & secure token exchange</span>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-6 bg-bg-canvas border-t border-border-subtle mt-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-4">
                    <span className="text-caption font-caption font-semibold text-text-muted">
                        © 2026 Taskora Inc. All rights reserved.
                    </span>
                    <div className="flex items-center gap-6">
                        <a
                            href="#privacy"
                            className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="#terms"
                            className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="#help"
                            className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                        >
                            Help
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
