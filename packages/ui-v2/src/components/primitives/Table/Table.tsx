import { BodyCell, BodyRow, HeadCell, StyledTable } from "./Table.styles";
import type { TableProps } from "./Table.types";

/** Tablo — Micro (8 Bold +%6) başlık, Body satır. */
export const Table = ({ columns, rows, dense = false, ariaLabel, className }: TableProps) => (
  <StyledTable className={className} aria-label={ariaLabel}>
    <thead>
      <tr>
        {columns.map((column) => (
          <HeadCell key={column.key} $width={column.width} $align={column.align ?? "left"}>
            {column.label}
          </HeadCell>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <BodyRow key={index} $dense={dense}>
          {columns.map((column) => (
            <BodyCell key={column.key} $align={column.align ?? "left"}>
              {row[column.key]}
            </BodyCell>
          ))}
        </BodyRow>
      ))}
    </tbody>
  </StyledTable>
);

Table.displayName = "Table";
