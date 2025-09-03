// import type { ComponentProps } from "react";
// import ReactQuill from "react-quill";

// type ReactQuillProps = ComponentProps<typeof ReactQuill>;

const toolBarOptions = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ size: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    ["link", "image"],
    ["clean"],
  ],
};

// export function Quill(props: ReactQuillProps) {
//   return <ReactQuill {...props} modules={toolBarOptions} />;
// }

import React, { lazy, Suspense } from 'react';
import { ReactQuillProps } from 'react-quill';

const QuillEditor = lazy(() => import('react-quill'));
import 'react-quill/dist/quill.snow.css';
const isBrowser = typeof window !== 'undefined';

const Quill: React.FC<ReactQuillProps> = (props) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {<QuillEditor {...props} modules={props.modules ?? toolBarOptions}/>}
    </Suspense>
  );
};

export default Quill;
