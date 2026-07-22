import { useEffect, useRef, useState } from 'react';
import { useAdminAuth } from './AdminAuth';
import ShaderBackground from '../display/ShaderBackground';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const { login, sessionMessage } = useAdminAuth();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pinInput = useRef(null);

  useEffect(() => {
    pinInput.current?.focus();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!pin || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      await login(pin);
    } catch (loginError) {
      if (loginError.status === 429) {
        setError('Too many attempts — try again in 5 minutes.');
      } else if (loginError.status === 401) {
        setError('Incorrect PIN — try again.');
      } else {
        setError(loginError.message || 'Unable to sign in. Check the server and try again.');
      }
      setPin('');
      pinInput.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleMessage = error || sessionMessage;
  const isRateLimited = error.includes('Too many attempts');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16 text-on-surface">
      <ShaderBackground variant="shader_2" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(26,18,69,0.5)_0%,rgba(8,13,26,0.8)_60%,#080d1a_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/5 blur-3xl" />

      {isRateLimited && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-5 z-10 flex items-center gap-3 rounded-md border border-error/70 bg-error-container/90 px-6 py-3 text-error shadow-[0_0_24px_rgba(255,180,171,0.2)]"
        >
          <span className="material-symbols-outlined" aria-hidden="true">warning</span>
          <span className="font-label-caps text-label-caps tracking-widest">{error}</span>
        </motion.div>
      )}

      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.1 }}
          className="mb-7 rounded-full bg-secondary/15 p-5 shadow-[0_0_42px_rgba(240,192,62,0.35)]"
        >
          <span className="material-symbols-outlined text-6xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">trophy</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-9 font-display-lg text-4xl font-black tracking-tight text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.45)] sm:text-display-lg"
        >
          QUIZ MASTER CONTROL
        </motion.h1>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          onSubmit={handleSubmit}
          className="w-full max-w-xl rounded-xl border border-tertiary/20 bg-surface/75 p-8 shadow-[inset_0_0_30px_rgba(10,0,73,0.9),0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-12"
        >
          <label htmlFor="admin-pin" className="mb-5 block font-label-caps text-label-caps tracking-[0.18em] text-tertiary uppercase">
            Enter Access Code
          </label>
          <div className="relative mb-5">
            <input
              ref={pinInput}
              id="admin-pin"
              name="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              aria-describedby={visibleMessage ? 'login-error' : undefined}
              aria-invalid={Boolean(visibleMessage)}
              className={`h-16 w-full rounded-lg border bg-surface-container-highest/70 px-5 pr-14 text-center font-headline-md text-2xl tracking-[0.55em] text-secondary outline-none transition focus:border-secondary focus:shadow-[inset_0_0_15px_rgba(240,192,62,0.45)] ${visibleMessage ? 'border-error shadow-[inset_0_0_15px_rgba(255,180,171,0.35)]' : 'border-outline-variant'}`}
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-outline-variant hover:text-secondary transition-colors"
              aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              <span className="material-symbols-outlined text-xl">{showPin ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>

          {visibleMessage && !isRateLimited && (
            <p id="login-error" role="alert" className="mb-5 flex items-center justify-center gap-2 text-error">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">error</span>
              <span>{visibleMessage}</span>
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={!pin || isSubmitting}
            className="hex-clip mx-auto flex h-16 w-full max-w-60 items-center justify-center gap-2 border border-secondary bg-primary-container px-8 font-label-caps text-label-caps tracking-[0.16em] text-secondary shadow-[0_0_18px_rgba(240,192,62,0.32)] transition hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-secondary/60 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? 'VERIFYING…' : 'ENTER'}
            {!isSubmitting && <span className="material-symbols-outlined text-xl" aria-hidden="true">login</span>}
          </motion.button>
        </motion.form>
      </section>
    </main>
  );
}
