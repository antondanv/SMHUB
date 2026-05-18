import ReferenceSelect from './ReferenceSelect';

function ProgramSelect({
  programs,
  isLoading,
  hasError,
  ...props
}) {
  return (
    <ReferenceSelect
      options={programs}
      placeholder="Выберите направление"
      getOptionLabel={(program) => `${program.code} - ${program.name}`}
      isLoading={isLoading}
      hasError={hasError}
      errorMessage="Не удалось загрузить список направлений."
      {...props}
    />
  );
}

export default ProgramSelect;
