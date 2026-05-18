import ReferenceSelect from './ReferenceSelect';

function SubjectSelect({
  subjects,
  isLoading,
  hasError,
  ...props
}) {
  return (
    <ReferenceSelect
      options={subjects}
      placeholder="Выберите предмет"
      getOptionLabel={(subject) => subject.name}
      isLoading={isLoading}
      hasError={hasError}
      errorMessage="Не удалось загрузить список предметов."
      {...props}
    />
  );
}

export default SubjectSelect;
