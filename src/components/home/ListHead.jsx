// The heading row and empty line every list on Home shares.
export function ListHead({ id, children, action }) {
  return (
    <div className="sech">
      <h2 id={id} className="lbl">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="border-b border-line px-0.5 py-2 text-[13px] text-muted">{children}</p>
}
