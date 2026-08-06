// src/components/PaginationBar.tsx
//
// Requer: npm install @mui/material @emotion/react @emotion/styled
//
// OBS: usamos uma <div> com `sx` (via Box) em vez de <Stack> de propósito.
// O componente Stack do MUI tem duas sobrecargas de tipos (com e sem a prop
// `component`) e, em projetos onde @types/react está com uma versão que não
// bate exatamente com a esperada pelo MUI, o TypeScript não consegue decidir
// qual sobrecarga usar e aponta erro pedindo `component` mesmo sem precisar
// dele. Box não sofre desse problema porque tem só uma assinatura de props.
import Pagination from "@mui/material/Pagination";
import Box from "@mui/material/Box";

interface PaginationBarProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export default function PaginationBar({ page, pages, onChange }: PaginationBarProps) {
  if (pages <= 1) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: "1.5rem" }}>
      <Pagination
        page={page}
        count={pages}
        onChange={(_, p) => onChange(p)}
        shape="rounded"
        color="standard"
        sx={{
          "& .MuiPaginationItem-root": {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 700,
            color: "#4b5563",
          },
          "& .MuiPaginationItem-root:hover": {
            backgroundColor: "rgba(255,98,0,0.10)",
          },
          "& .Mui-selected": {
            backgroundColor: "#FF6200 !important",
            color: "#fff",
          },
        }}
      />
    </Box>
  );
}