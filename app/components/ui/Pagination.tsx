import React from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { cn } from '~/lib/utils';
export const DOTS = '...';

const range = (start: number, end: number) => {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
};

const usePagination = ({
  totalCount,
  pageSize,
  siblingCount = 1,
  currentPage,
}: {
  totalCount: number;
  pageSize: number;
  siblingCount?: number;
  currentPage: number;
}) => {
  const paginationRange = React.useMemo(() => {
    const totalPageCount = Math.ceil(totalCount / pageSize);

    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPageCount) {
      return range(1, totalPageCount);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    // Case 1: No left dots, but right dots
    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, totalPageCount];
    }

    // Case 2: Left dots, but no right dots
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightRange = range(totalPageCount - (3 + 2 * siblingCount) + 1, totalPageCount);
      return [firstPageIndex, DOTS, ...rightRange];
    }

    // Case 3: Left dots and right dots
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }

    return [];
  }, [totalCount, pageSize, siblingCount, currentPage]);

  return paginationRange;
};

export const Pagination = ({
  onPageChange,
  totalCount,
  siblingCount = 1,
  currentPage,
  pageSize,
  className,
  disabled
}: {
  onPageChange: (page: number) => void;
  totalCount: number;
  siblingCount?: number;
  currentPage: number;
  pageSize: number;
  className?: string;
  disabled?: boolean;
}) => {
  const pageIndices = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  });

  if (currentPage === 0 || pageIndices.length < 2) {
    return null;
  }

  const onNext = () => {
    onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    onPageChange(currentPage - 1);
  };

  const lastPage = pageIndices[pageIndices.length - 1];
  return (
    <div
      className={cn(
        'flex flex-row bg-white text-gray-400 w-max [&_:is(button:disabled)]:text-gray-300 [&_:is(button:disabled:hover)]:text-gray-300 text-lg overflow-hidden',
        className
      )}
    >
      <button
        type='button'
        className='transition enabled:hover:bg-primary-500 enabled:hover:text-white px-1 py-2'
        disabled={disabled || currentPage === 1}
        onClick={onPrevious}
      >
        <BiChevronLeft className='w-7 h-7' />
      </button>
      {pageIndices.map((pageNumber) => {
        if (typeof pageNumber !== 'number') {
          return (
            <span className='px-2 py-2' key={pageNumber}>
              &#8230;
            </span>
          );
        }
        return (
          <button
            type='button'
            disabled={disabled}
            key={pageNumber}
            className={`grid items-center px-3 py-2 transition ${
              pageNumber === currentPage
                ? 'text-primary-500 font-extrabold hover:text-primary-500'
                : 'hover:bg-primary-500 hover:text-white'
            }`}
            onClick={() => {
              if (pageNumber !== currentPage) {
                onPageChange(pageNumber);
              }
            }}
          >
            {pageNumber}
          </button>
        );
      })}
      <button
        type='button'
        className='transition enabled:hover:bg-primary-500 enabled:hover:text-white px-1 py-2'
        disabled={disabled || currentPage === lastPage}
        onClick={onNext}
      >
        <BiChevronRight className='w-7 h-7' />
      </button>
    </div>
  );
};
