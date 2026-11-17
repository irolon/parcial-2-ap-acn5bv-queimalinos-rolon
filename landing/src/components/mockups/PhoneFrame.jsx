export function PhoneFrame({ label, className = '', innerClassName = '', children }) {
  return (
    <div role="img" aria-label={label} className={`rounded-[38px] border-2 border-surface-2 bg-[#070808] p-2.5 ${className}`}>
      <div className={`flex min-h-[500px] flex-col gap-3 overflow-hidden rounded-[30px] bg-bg-0 px-3.5 pt-3.5 pb-4 ${innerClassName}`}>
        <div className="mx-auto -mt-1.5 mb-0.5 h-[22px] w-[84px] rounded-pill bg-[#070808]" />
        {children}
      </div>
    </div>
  )
}
