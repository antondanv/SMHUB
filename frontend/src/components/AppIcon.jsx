const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '1.9',
};

const iconPaths = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" {...strokeProps} />
      <path d="m20 20-3.8-3.8" {...strokeProps} />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" {...strokeProps} />
      <path d="M5 12h14" {...strokeProps} />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" {...strokeProps} />,
  files: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" {...strokeProps} />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...strokeProps} />
    </>
  ),
  heart: (
    <path
      d="M21.25 8.59a4.96 4.96 0 0 0-8.43-3.52L12 5.89l-.82-.82a4.96 4.96 0 0 0-7.01 7.02L12 20l7.83-7.91a4.93 4.93 0 0 0 1.42-3.5Z"
      {...strokeProps}
    />
  ),
  star: (
    <path
      d="M12 4.2 14.5 9.3 20.1 10.1 16 14.1 17 19.8 12 17.1 7 19.8 8 14.1 3.9 10.1 9.5 9.3Z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.2"
    />
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3.18-3.18a4 4 0 0 0-5.66-5.66l-1.06 1.06" {...strokeProps} />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3.18 3.18a4 4 0 0 0 5.66 5.66l1.06-1.06" {...strokeProps} />
    </>
  ),
};

function AppIcon({ name, className = '', size = 20 }) {
  const icon = iconPaths[name];

  if (!icon) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      {icon}
    </svg>
  );
}

export default AppIcon;
