function ReferenceSelect({
  value,
  onChange,
  options,
  placeholder,
  getOptionLabel,
  isLoading = false,
  isDisabled = false,
  hasError = false,
  errorMessage = 'Не удалось загрузить справочник.',
  ...props
}) {
  return (
    <>
      <select
        value={value}
        onChange={onChange}
        disabled={isDisabled || isLoading || hasError}
        {...props}
      >
        <option value="">
          {isLoading ? 'Загрузка...' : placeholder}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {getOptionLabel(option)}
          </option>
        ))}
      </select>
      {hasError && (
        <small>{errorMessage}</small>
      )}
    </>
  );
}

export default ReferenceSelect;
