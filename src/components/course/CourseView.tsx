import LessonInterface from '../pages/LessonInterface';

export const CourseView: React.FC = () => {
  // The dedicated lesson experience now lives in LessonInterface, which
  // already implements the Read / Watch / Practice trilogy flow.
  return <LessonInterface />;
};