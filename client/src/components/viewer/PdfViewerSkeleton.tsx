const PdfViewerSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#090c16] flex flex-col md:flex-row">

      {/* ════════════════════════════════════════
          PDF VIEWER SIDE
      ════════════════════════════════════════ */}
      <div className={`relative flex flex-col ${isMobile ? 'w-full h-full' : 'w-3/5 h-full'} bg-[#0c0e1a]`}>

        {/* Top bar */}
        <div className="shrink-0 h-[52px] flex items-center gap-2 px-3 border-b border-white/[0.045] bg-[#090c16]/80 backdrop-blur-xl">

          {/* Back */}
          <div className="h-9 w-9 rounded-2xl bg-white/[0.06] animate-[ppsk-pulse_2s_ease-in-out_infinite] shrink-0" />

          {/* Title */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3 w-36 rounded-full bg-white/[0.08] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            <div className="h-2 w-7 rounded-full bg-cyan-400/20 animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
          </div>

          {/* Controls */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Zoom pill */}
            <div className="flex items-center gap-1 h-9 px-2 rounded-2xl bg-white/[0.05]">
              <div className="h-5 w-5 rounded-xl bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="h-2.5 w-10 rounded-full bg-white/[0.06] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="h-5 w-5 rounded-xl bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="h-5 w-8 rounded-xl bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="h-5 w-10 rounded-xl bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            </div>
            <div className="h-9 w-16 rounded-2xl bg-white/[0.06] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            <div className="h-9 w-16 rounded-2xl bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            {/* Page input */}
            <div className="h-9 w-20 rounded-2xl bg-white/[0.06] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            <div className="h-9 w-9 rounded-2xl bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
          </div>

          {/* Mobile: just page + menu */}
          <div className="flex md:hidden items-center gap-1.5">
            <div className="h-9 w-16 rounded-2xl bg-white/[0.06] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            <div className="h-9 w-9 rounded-2xl bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] w-full bg-white/[0.04] shrink-0 overflow-hidden">
          <div
            className="h-full w-2/5 rounded-full bg-gradient-to-r from-cyan-500/50 via-sky-400/70 to-cyan-500/50 animate-[ppsk-pulse_1.6s_ease-in-out_infinite]"
          />
        </div>

        {/* PDF page area */}
        <div className="flex-1 min-h-0 flex items-start justify-center overflow-hidden pt-5 px-4 pb-4">
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-[#14172a] shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
            style={{ aspectRatio: '1 / 1.414' }}
          >
            {/* Shimmer sweep on page */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background: 'linear-gradient(108deg, transparent 35%, rgba(255,255,255,0.04) 50%, transparent 65%)',
                animation: 'ppsk-shimmer 2.4s ease-in-out infinite',
              }}
            />

            <div className="absolute inset-0 p-[7%] flex flex-col gap-0">
              {/* Title */}
              <div className="h-[3.5%] w-[58%] rounded-md bg-white/[0.08] animate-[ppsk-pulse_2s_ease-in-out_infinite] mb-[1.5%]" />
              <div className="h-[2%] w-[34%] rounded bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite] mb-[2.5%]" />
              {/* Divider */}
              <div className="h-px w-full bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite] mb-[2.5%]" />
              {/* Para 1 */}
              {[93, 88, 96, 90, 84, 42].map((w, i) => (
                <div
                  key={i}
                  className="rounded-full bg-white/[0.065] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                  style={{ height: '1.2%', width: `${w}%`, marginBottom: '1%', animationDelay: `${i * 0.06}s` }}
                />
              ))}
              {/* Two col */}
              <div className="flex gap-3 mb-[2%] mt-[1%]">
                {[[88, 92, 80, 86], [91, 85, 94, 87]].map((lines, ci) => (
                  <div key={ci} className="flex-1 flex flex-col gap-[1%]">
                    {lines.map((pct, li) => (
                      <div
                        key={li}
                        className="rounded-full bg-white/[0.055] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                        style={{ height: '1.2%', width: `${pct}%`, animationDelay: `${(ci * 4 + li) * 0.05}s` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Figure */}
              <div className="mx-auto rounded-xl bg-white/[0.035] animate-[ppsk-pulse_2s_ease-in-out_infinite] flex items-center justify-center mb-[2%]"
                style={{ height: '14%', width: '60%' }}>
                <svg aria-hidden="true" className="text-white/[0.06]" style={{ width: '16%' }} fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5A.75.75 0 0121 5.25v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18.75V5.25A.75.75 0 013.75 4.5z" />
                </svg>
              </div>
              {/* Para 2 */}
              {[90, 85, 93, 36].map((w, i) => (
                <div
                  key={i}
                  className="rounded-full bg-white/[0.055] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                  style={{ height: '1.2%', width: `${w}%`, marginBottom: '1%', animationDelay: `${i * 0.07}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CHAT SIDE — Desktop only
      ════════════════════════════════════════ */}
      {!isMobile && (
        <aside className="w-2/5 h-full bg-[#080a12] flex flex-col border-l border-white/[0.04]">

          {/* Chat header */}
          <div className="shrink-0 h-[55px] px-4 flex items-center gap-3 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="h-9 w-9 rounded-2xl bg-white/[0.05] border border-cyan-400/10 animate-[ppsk-pulse_2s_ease-in-out_infinite] shrink-0" />
            <div className="h-3 w-20 rounded-full bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
          </div>

          {/* Chat messages */}
          <div className="flex-1 min-h-0 px-4 py-5 flex flex-col gap-5 overflow-hidden">

            {/* AI bubble 1 */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-white/[0.05] border border-cyan-500/10 animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2.5 w-10 rounded-full bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
                <div className="relative overflow-hidden rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/[0.05] p-3 flex flex-col gap-1.5">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                      animation: 'pvsk-shimmer 2s ease-in-out infinite',
                    }}
                  />
                  {[82, 91, 76, 88, 55].map((w, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                      style={{ height: 7, width: `${w}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 pl-11">
              {[
                { w: 112 }, { w: 80 }, { w: 98 }, { w: 68 },
              ].map((chip, i) => (
                <div
                  key={i}
                  className="h-8 rounded-xl bg-white/[0.04] border border-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                  style={{ width: chip.w, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>

            {/* AI bubble 2 */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-white/[0.05] border border-cyan-500/10 animate-[ppsk-pulse_2s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-2.5 w-10 rounded-full bg-white/[0.05] animate-[ppsk-pulse_2s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
                <div className="relative overflow-hidden rounded-2xl rounded-tl-none bg-white/[0.04] border border-white/[0.05] p-3 flex flex-col gap-1.5">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                      animation: 'pvsk-shimmer 2s ease-in-out infinite 0.4s',
                    }}
                  />
                  {[78, 86, 62].map((w, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-white/[0.07] animate-[ppsk-pulse_2s_ease-in-out_infinite]"
                      style={{ height: 7, width: `${w}%`, animationDelay: `${0.2 + i * 0.08}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat input */}
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.04]">
            <div className="relative overflow-hidden flex items-center gap-2 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)',
                  animation: 'pvsk-shimmer 2.2s ease-in-out infinite',
                }}
              />
              <div className="flex-1 h-2.5 w-28 rounded-full bg-white/[0.055] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/10 animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            </div>
            <div className="mt-2 flex justify-center">
              <div className="h-1.5 w-32 rounded-full bg-white/[0.03] animate-[ppsk-pulse_2s_ease-in-out_infinite]" />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export default PdfViewerSkeleton;