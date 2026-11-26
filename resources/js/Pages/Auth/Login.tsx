import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Login({
    status,
    canResetPassword = true,
}: {
    status?: string;
    canResetPassword?: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="bg-bg-canvas text-text-primary min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary-fixed selection:text-primary">
            <Head title="Login — Taskora" />

            {/* Top Minimal Brand Header */}
            <header className="w-full bg-surface-card border-b border-border-subtle py-4 px-6 md:px-12 flex justify-between items-center shrink-0">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-[20px] fill-1">check_circle</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-headline-md text-headline-md text-text-primary tracking-tight font-bold leading-none">Taskora</span>
                        <span className="font-caption text-caption text-text-muted">Task Management</span>
                    </div>
                </Link>
                <div className="flex items-center gap-4">
                    <span className="font-body-sm text-body-sm text-text-muted hidden sm:inline">Need assistance?</span>
                    <a href="#help" className="font-label-md text-label-md text-primary hover:text-accent-hover font-semibold transition-colors duration-150 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">help</span>
                        Help Center
                    </a>
                </div>
            </header>

            {/* Main Split Layout */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* Left Column: Productivity Preview */}
                    <section className="lg:col-span-7 flex flex-col justify-center space-y-6 lg:pr-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-badge-completed-bg border border-border-subtle text-badge-completed-text font-label-sm text-label-sm mb-4">
                                <span className="material-symbols-outlined text-[16px] fill-1">verified</span>
                                Refined Technical Focus
                            </div>
                            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-tight">
                                Organize your daily tasks <span className="text-primary font-bold">effortlessly.</span>
                            </h1>
                            <p className="font-body-lg text-body-lg text-text-muted mt-3 max-w-xl">
                                A distraction-free productivity environment designed for high cognitive throughput and transparent workflow execution.
                            </p>
                        </div>

                        {/* Bento Showcase / Mockup Preview */}
                        <div className="bg-surface-card rounded-xl border border-border-subtle card-shadow p-6 space-y-5">
                            {/* 3-Card Summary Grid */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-bg-canvas border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="font-caption text-caption text-text-muted uppercase tracking-wider">Total Tasks</span>
                                        <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                                    </div>
                                    <div className="font-headline-lg text-headline-lg text-text-primary mt-2">12</div>
                                </div>
                                <div className="bg-bg-canvas border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="font-caption text-caption text-text-muted uppercase tracking-wider">Completed</span>
                                        <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                                    </div>
                                    <div className="font-headline-lg text-headline-lg text-badge-completed-text mt-2">8</div>
                                </div>
                                <div className="bg-bg-canvas border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="font-caption text-caption text-text-muted uppercase tracking-wider">Pending</span>
                                        <span className="w-2 h-2 rounded-full bg-badge-pending-text"></span>
                                    </div>
                                    <div className="font-headline-lg text-headline-lg text-badge-pending-text mt-2">4</div>
                                </div>
                            </div>

                            {/* Task Strip Mockup */}
                            <div className="space-y-2.5 pt-1">
                                <div className="text-caption font-caption text-text-muted tracking-wider uppercase font-semibold">Today's Focus Preview</div>
                                <div className="flex items-center justify-between p-3 bg-bg-canvas border border-border-subtle rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded bg-tertiary-container flex items-center justify-center text-on-tertiary text-[14px]">
                                            <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-body-md text-body-md text-text-muted line-through">Review wireframe iterations</span>
                                            <span className="font-caption text-caption text-text-muted">Due 10:00 AM • Assignment</span>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-badge-completed-bg text-badge-completed-text font-label-sm text-label-sm">Completed</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-surface-card border border-border-subtle rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded border-[1.5px] border-border-hover bg-surface-card"></div>
                                        <div className="flex flex-col">
                                            <span className="font-body-md text-body-md font-semibold text-text-primary">Finalize application component specs</span>
                                            <span className="font-caption text-caption text-text-muted">Due 2:30 PM • High Priority</span>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-badge-urgent-bg text-badge-urgent-text font-label-sm text-label-sm">High Priority</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-1 text-text-muted font-body-sm text-body-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-badge-completed-text">check_circle</span>
                                <span>Distraction-free workspace</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px] text-primary">speed</span>
                                <span>Fast inline task capture</span>
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Login Card */}
                    <section className="lg:col-span-5 w-full max-w-[440px] mx-auto">
                        <div className="bg-surface-card rounded-xl border border-border-subtle card-shadow p-8 space-y-6">
                            <div className="space-y-1.5">
                                <h2 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-bold">Welcome back!</h2>
                                <p className="font-body-md text-body-md text-text-muted">
                                    Enter your credentials to access your daily tasks and stay productive.
                                </p>
                            </div>

                            {status && (
                                <div className="p-3 rounded-lg bg-badge-completed-bg text-badge-completed-text text-body-sm">
                                    {status}
                                </div>
                            )}

                            <form className="space-y-4" onSubmit={submit}>
                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="block font-label-md text-label-md font-medium text-text-primary" htmlFor="email">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full h-11 px-3 py-2 bg-surface-card border border-border-subtle rounded-lg font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-150"
                                        />
                                    </div>
                                    <InputError message={errors.email} />
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block font-label-md text-label-md font-medium text-text-primary" htmlFor="password">
                                            Password
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="••••••••••••"
                                            required
                                            className="w-full h-11 pl-3 pr-10 py-2 bg-surface-card border border-border-subtle rounded-lg font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-150"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                                            aria-label="Toggle password visibility"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>

                                {/* Remember me & Forgot Password */}
                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            name="remember"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                            className="w-4 h-4 rounded border-border-hover text-primary focus:ring-primary focus:ring-offset-0 bg-surface-card"
                                        />
                                        <span className="font-body-sm text-body-sm text-text-muted">Remember me</span>
                                    </label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="font-label-sm text-label-sm font-semibold text-primary hover:text-accent-hover transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>

                                {/* Primary Action: Log In */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-primary-container text-on-primary py-2.5 px-5 rounded-lg font-label-md text-label-md font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <span>Log In</span>
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-border-subtle"></div>
                                    <span className="flex-shrink mx-3 font-caption text-caption uppercase text-text-muted tracking-wider">or</span>
                                    <div className="flex-grow border-t border-border-subtle"></div>
                                </div>

                                {/* Secondary Action: Create Account */}
                                <div>
                                    <Link
                                        href={route('register')}
                                        className="w-full bg-surface-card border border-border-subtle text-text-primary py-2.5 px-5 rounded-lg font-label-md text-label-md font-medium hover:bg-bg-canvas hover:border-border-hover active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-text-muted">person_add</span>
                                        <span>Create an Account</span>
                                    </Link>
                                </div>
                            </form>

                            {/* Security Footnote */}
                            <div className="pt-2 border-t border-border-subtle text-center">
                                <p className="font-caption text-caption text-text-muted flex items-center justify-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                    Protected by encrypted sessions & secure token exchange
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-border-subtle py-6 bg-surface-card shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-4">
                    <span className="font-caption text-caption text-text-muted font-medium">
                        © 2026 Taskora Inc. All rights reserved.
                    </span>
                    <div className="flex items-center gap-6">
                        <a href="#privacy" className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors">Privacy Policy</a>
                        <a href="#terms" className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors">Terms of Service</a>
                        <a href="#help" className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors">Help</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
