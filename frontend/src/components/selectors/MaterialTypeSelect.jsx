import ReferenceSelect from './ReferenceSelect';

function MaterialTypeSelect({
  materialTypes,
  isLoading,
  hasError,
  ...props
}) {
  return (
    <ReferenceSelect
      options={materialTypes}
      placeholder="Выберите тип материала"
      getOptionLabel={(materialType) => materialType.name}
      isLoading={isLoading}
      hasError={hasError}
      errorMessage="Не удалось загрузить типы материалов."
      {...props}
    />
  );
}

export default MaterialTypeSelect;
