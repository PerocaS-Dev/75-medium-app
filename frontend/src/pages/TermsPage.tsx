import { Link } from "react-router-dom";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-xl font-medium text-clay-950 mb-2">{title}</h2>
      <div className="flex flex-col gap-2 font-sans text-[15px] leading-relaxed text-clay-600">
        {children}
      </div>
    </section>
  );
}

/**
 * Public, pre-login Terms & Privacy page. Warm and plain-language on the surface, but the
 * POPIA / data-handling substance is real: what we collect, how photos are stored, consent,
 * and the right to delete. Linked from the auth screen.
 */
export function TermsPage() {
  return (
    <div className="min-h-screen bg-clay-50">
      <div className="mx-auto w-full max-w-[640px] px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lift"
            style={{ background: "linear-gradient(150deg, var(--blush-400), var(--lilac-400))" }}
          >
            <span className="font-display text-2xl font-semibold text-white">75</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-medium text-clay-950">Terms &amp; Privacy</h1>
            <p className="mt-1 font-sans text-base text-clay-500">
              The plain-language version — but every word of it is true.
            </p>
          </div>
        </div>

        {/* The short version */}
        <div className="mb-8 rounded-xl border border-peach-300 bg-peach-100 px-5 py-5">
          <p className="mb-2 text-caption font-semibold uppercase tracking-widest text-peach-600">
            The short version
          </p>
          <ul className="flex flex-col gap-1.5 font-sans text-[15px] leading-relaxed text-clay-800">
            <li>• 75 Medium helps you and your friends run a 75-day challenge together.</li>
            <li>• Your photos and journals are <strong className="font-semibold">private by default</strong> — sharing is always your explicit choice.</li>
            <li>• We only collect what the app needs to work. No selling your data, ever.</li>
            <li>• You can delete any photo, or your whole account, whenever you want.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-7 rounded-xl border border-clay-200 bg-paper px-6 py-7 shadow-soft">
          <Section title="Who we are">
            <p>
              75 Medium is a small accountability app for a small group of people — think of it as a
              shared notebook for a 75-day challenge, not a social network. It's built and run under
              South African law, including the Protection of Personal Information Act (POPIA).
            </p>
          </Section>

          <Section title="What we collect">
            <p>Only what makes the challenge work:</p>
            <p>
              <strong className="font-semibold text-clay-800">Your account</strong> — your email
              address, a display name, and your time zone (so a day closes at your midnight, not
              someone else's). Your password is stored only as a secure hash; we never see it.
            </p>
            <p>
              <strong className="font-semibold text-clay-800">Your challenge</strong> — the daily
              tasks you set, whether you checked them off each day, and the streak/tier numbers that
              come out of that.
            </p>
            <p>
              <strong className="font-semibold text-clay-800">What you write and upload</strong> —
              your journal entries and progress photos, each tagged with who you've chosen to share
              it with.
            </p>
          </Section>

          <Section id="privacy" title="How your progress photos are stored">
            <p>
              This is the part we're most careful about. When you upload a photo, the image file
              itself is stored in dedicated, access-controlled object storage — <em>not</em> in our
              main database. Our database only ever holds a reference to it (an object key) plus
              details like the caption, who it's shared with, and when it was taken.
            </p>
            <p>
              Photos are never on a public URL. Each time one is shown, we generate a{" "}
              <strong className="font-semibold text-clay-800">short-lived signed link</strong> that
              expires quickly, so images can't be hotlinked or passed around.
            </p>
            <p>
              When you share a photo with friends, we stamp it with a{" "}
              <strong className="font-semibold text-clay-800">watermark of the viewer's name</strong>{" "}
              before it's delivered, so every view is traceable. We'll be honest with you: on the
              web, nothing can technically stop a determined screenshot. Signed links, watermarking
              and friction raise the bar and create accountability — they are not a guarantee, and
              we won't pretend otherwise.
            </p>
          </Section>

          <Section title="Who can see what">
            <p>
              Private by default. A photo or journal entry is visible only to you unless you
              explicitly set it to <strong className="font-semibold text-clay-800">Friends</strong>.
            </p>
            <p>
              Friends can see your streak and progress numbers, but never <em>which</em> specific
              tasks you did or missed — the app is built to share counts, not the private detail
              behind them.
            </p>
          </Section>

          <Section title="Your consent">
            <p>
              When you create an account and again before you upload your first photo, we ask for
              your clear consent to handle your information as described here, as POPIA requires. You
              give it freely, and you can withdraw it at any time by deleting your data (below).
            </p>
          </Section>

          <Section title="Your rights — including deleting your data">
            <p>Your data stays yours. At any time you can:</p>
            <p>
              • <strong className="font-semibold text-clay-800">Delete any photo</strong> — the image
              is removed from storage, not just hidden.
            </p>
            <p>
              • <strong className="font-semibold text-clay-800">Delete your whole account</strong> —
              which removes your personal information and progress photos. Ask us and we'll action
              it; POPIA gives you the right to have your personal information deleted.
            </p>
            <p>
              You also have the right to see what we hold about you and to correct anything that's
              wrong. Just get in touch.
            </p>
          </Section>

          <Section title="Being a good friend">
            <p>
              Because friends can see each other's shared photos, one house rule: don't screenshot,
              save, or re-share anyone else's photos outside the app. The watermark identifies you as
              the viewer. Treat other people's progress with the same care you'd want for your own.
            </p>
          </Section>

          <Section title="Talk to us">
            <p>
              Questions, a correction, or a deletion request? Reach out to the person who invited you
              to 75 Medium, or the account owner who runs your group — they can pass anything on.
            </p>
          </Section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="font-sans text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 transition-colors hover:text-clay-950"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
