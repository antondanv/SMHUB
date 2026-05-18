import ReferenceSelect from './ReferenceSelect';

function CourseSelect({
  courses,
  isLoading,
  hasError,
  ...props
}) {
  return (
    <ReferenceSelect
      options={courses}
      placeholder="Выберите курс"
      getOptionLabel={(course) => `${course.number} курс`}
      isLoading={isLoading}
      hasError={hasError}
      errorMessage="Не удалось загрузить список курсов."
      {...props}
    />
  );
}

export default CourseSelect;
