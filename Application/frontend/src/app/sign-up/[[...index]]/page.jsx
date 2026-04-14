import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <main className="relative min-h-[100dvh] bg-[#020617] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col pt-20 px-4 pb-8">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px] -translate-y-12 flex flex-col items-center">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none text-blue-400">
                  System Active
                </span>
              </div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
                Real-Time Topic Tracker
              </h1>
              <p className="text-sm text-slate-400">
                Alert Intelligence & Monitoring System v2.0
              </p>
            </div>

            <div className="w-full flex justify-center">
              <SignUp
                appearance={{
                  baseTheme: dark,
                  elements: {
                    rootBox: "w-full",
                    card: "w-full mx-auto border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-md",
                    formButtonPrimary: "bg-blue-600 text-sm font-medium transition-all hover:bg-blue-700 active:scale-[0.98]",
                    headerTitle: "text-xl font-semibold",
                    headerSubtitle: "text-slate-400",
                    socialButtonsBlockButton: "border-slate-700 bg-slate-800/50 text-white transition-colors hover:bg-slate-800",
                    formFieldInput: "border-slate-700 bg-slate-950/50 text-white transition-all focus:border-blue-500",
                    footerActionLink: "font-medium text-blue-400 hover:text-blue-300",
                    dividerLine: "bg-slate-800",
                    dividerText: "text-xs font-bold uppercase text-slate-500",
                  },
                }}
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}