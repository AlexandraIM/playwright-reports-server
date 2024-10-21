'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  type Selection,
  Spinner,
  Pagination,
} from '@nextui-org/react';

import { withQueryParams } from '@/app/lib/network';
import { defaultProjectName } from '@/app/lib/constants';
import TablePaginationOptions from '@/app/components/table-pagination-options';
import useQuery from '@/app/hooks/useQuery';
import ErrorMessage from '@/app/components/error-message';
import FormattedDate from '@/app/components/date-format';
import { ReadResultsOutput, type Result } from '@/app/lib/storage';
import DeleteResultsButton from '@/app/components/delete-results-button';

const columns = [
  { name: 'ID', uid: 'resultID' },
  { name: 'Project', uid: 'project' },
  { name: 'Created At', uid: 'createdAt' },
  { name: 'Tags', uid: 'tags' },
  { name: 'Actions', uid: 'actions' },
];

const getTags = (item: Result) => {
  return Object.entries(item).filter(([key]) => !['resultID', 'createdAt', 'project'].includes(key));
};

interface ResultsTableProps {
  selected?: string[];
  onSelect?: (results: Result[]) => void;
  onDeleted?: () => void;
}

export default function ResultsTable({ onSelect, onDeleted, selected }: ResultsTableProps) {
  const resultListEndpoint = '/api/result/list';
  const [project, setProject] = useState(defaultProjectName);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const getQueryParams = () => ({
    limit: rowsPerPage.toString(),
    offset: ((page - 1) * rowsPerPage).toString(),
    project,
  });
  const {
    data: resultsResponse,
    error,
    isLoading,
    refetch,
  } = useQuery<ReadResultsOutput>(withQueryParams(resultListEndpoint, getQueryParams()));

  useEffect(() => {
    if (isLoading) {
      return;
    }
    refetch({
      path: withQueryParams(resultListEndpoint, getQueryParams()),
    });
  }, [rowsPerPage, project, page]);

  const { results, total } = resultsResponse ?? {};

  const shouldRefetch = () => {
    onDeleted?.();
    refetch();
  };

  const onPageChange = useCallback(
    (page: number) => {
      setPage(page);
    },
    [page, rowsPerPage],
  );

  const onProjectChange = useCallback(
    (project: string) => {
      setProject(project);
      setPage(1);
    },
    [page, rowsPerPage],
  );

  const pages = React.useMemo(() => {
    return total ? Math.ceil(total / rowsPerPage) : 0;
  }, [project, total, rowsPerPage]);

  const onChangeSelect = (keys: Selection) => {
    if (keys === 'all') {
      const all = results ?? [];

      onSelect?.(all);
    }

    if (typeof keys === 'string') {
      return;
    }

    const selectedKeys = Array.from(keys);
    const selectedResults = results?.filter((r) => selectedKeys.includes(r.resultID)) ?? [];

    onSelect?.(selectedResults);
  };

  return error ? (
    <ErrorMessage message={error.message} />
  ) : (
    <>
      <TablePaginationOptions
        entity="result"
        rowPerPageOptions={[20, 40, 80, 120]}
        rowsPerPage={rowsPerPage}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
        total={total}
        onProjectChange={onProjectChange}
      />
      <Table
        aria-label="Results"
        bottomContent={
          pages > 1 ? (
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={page}
                total={pages}
                onChange={onPageChange}
              />
            </div>
          ) : null
        }
        selectedKeys={selected}
        selectionMode="multiple"
        onSelectionChange={onChangeSelect}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.uid} align={column.uid === 'actions' ? 'center' : 'start'}>
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody emptyContent="No results." isLoading={isLoading} items={results ?? []} loadingContent={<Spinner />}>
          {(item) => (
            <TableRow key={item.resultID}>
              <TableCell className="w-1/3">{item.resultID}</TableCell>
              <TableCell className="w-1/6">{item.project}</TableCell>
              <TableCell className="w-1/12">
                <FormattedDate date={new Date(item.createdAt)} />
              </TableCell>
              <TableCell className="w-1/3">
                {getTags(item).map(([key, value], index) => (
                  <Chip
                    key={index}
                    className="m-1 p-5 text-nowrap"
                    color="primary"
                    size="sm"
                  >{`${key}: ${value}`}</Chip>
                ))}
              </TableCell>
              <TableCell className="w-1/12">
                <div className="flex gap-4 justify-center">
                  <DeleteResultsButton resultIds={[item.resultID]} onDeletedResult={shouldRefetch} />
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
