import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="bg-bg-canvas text-text-primary antialiased min-h-screen flex flex-col justify-between selection:bg-primary-container selection:text-on-primary font-body-md">
            <Head title="Forgot Password — Taskora" />

            {/* Header */}
            <header className="w-full bg-surface-card border-b border-border-subtle shadow-sm z-20">
                <div className="flex justify-between items-center h-16 px-8 max-w-7xl mx-auto w-full">
                    <Link href="/" className="flex items-center gap-3 group focus:outline-none">
                        <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[20px] fill-1">task_alt</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-headline-md text-headline-md font-bold text-text-primary tracking-tight leading-tight">Taskora</span>
                            <span className="font-caption text-caption text-text-muted">Task Management</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-6">
                        <a href="#help" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors text-label-md font-label-md">
                            <span className="material-symbols-outlined text-[18px]">help_outline</span>
                            <span>Need assistance? <span className="text-primary font-semibold hover:underline">Help Center</span></span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <main className="flex-1 flex items-center justify-center p-6 md:p-12 lg:py-16">
                <div className="max-w-7xl w-full mx-auto items-center flex justify-center">
                    <div className="flex justify-center w-full">
                        <div className="w-full max-w-md bg-surface-card rounded-xl border border-border-subtle shadow-sm p-8 md:p-10 space-y-6">
                            
                            {/* Card Header */}
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-[24px]">lock_reset</span>
                                </div>
                                <h2 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">Reset your password</h2>
                                <p className="font-body-md text-body-md text-text-muted">
                                    Enter the email associated with your account and we'll send you instructions to reset your password.
                                </p>
                            </div>

                            {status && (
                                <div className="p-3.5 rounded-lg bg-badge-completed-bg text-badge-completed-text text-body-sm font-medium">
                                    {status}
                                </div>
                            )}

                            {/* Form Area */}
                            <form className="space-y-5" onSubmit={submit}>
                                {/* Email Input Field */}
                                <div className="space-y-1.5">
                                    <label className="block font-label-md text-label-md text-text-primary" htmlFor="email">
                                        Enter your registered email address
                                    </label>
                                    <div className="relative rounded-lg">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                                            <span className="material-symbols-outlined text-[20px]">mail</span>
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="alex.turner@taskora.io"
                                            required
                                            className="block w-full h-11 pl-11 pr-4 rounded-lg bg-surface-card border border-border-subtle font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:border-primary-container focus:ring-2 focus:ring-primary-container focus:ring-offset-2 transition-all outline-none"
                                        />
                                    </div>
                                    <InputError message={errors.email} />
                                </div>

                                {/* Primary Action Button */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full h-11 px-5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:bg-accent-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <span>Send Reset Link</span>
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>

                                {/* Helper Alert / Callout Box */}
                                <div className="p-3.5 rounded-lg bg-surface-container-low border border-border-subtle flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
                                    <p className="font-body-sm text-body-sm text-text-muted leading-snug">
                                        We'll send a password recovery link to this address if an account exists.
                                    </p>
                                </div>

                                {/* OR Divider */}
                                <div className="relative py-2 flex items-center justify-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border-subtle"></div>
                                    </div>
                                    <div className="relative px-3 bg-surface-card">
                                        <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">OR</span>
                                    </div>
                                </div>

                                {/* Back navigation button */}
                                <Link
                                    href={route('login')}
                                    className="w-full h-11 px-5 rounded-lg bg-surface-card border border-border-subtle font-label-md text-label-md font-medium text-text-primary hover:bg-bg-canvas hover:border-border-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-text-primary transition-colors">arrow_back</span>
                                    <span>Return to Log In</span>
                                </Link>
                            </form>

                            {/* Security Footnote */}
                            <div className="pt-4 border-t border-border-subtle flex items-center justify-center gap-2 text-center text-text-muted font-caption text-caption">
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                <span>Protected by encrypted sessions & secure token exchange</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-6 bg-bg-canvas border-t border-border-subtle">
                <div className="flex flex-col sm:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-4">
                    <div className="text-caption font-caption font-semibold text-text-muted">
                        © 2026 Taskora Inc. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#privacy" className="text-caption font-caption text-text-muted hover:text-text-primary transition-colors">Privacy Policy</a>
                        <a href="#terms" className="text-caption font-caption text-text-muted hover:text-text-primary transition-colors">Terms of Service</a>
                        <a href="#help" className="text-caption font-caption text-text-muted hover:text-text-primary transition-colors">Help</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
