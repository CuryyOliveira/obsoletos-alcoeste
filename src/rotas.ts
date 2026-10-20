/** Rotas com parâmetro, num só lugar: a rota e quem lê o parâmetro (useParams) não podem divergir. */
export const PARAM_LOTE = 't';
export const ROTA_LOTE = `/lote/:${PARAM_LOTE}`;
export const ROTA_PREVIA = `previa/:${PARAM_LOTE}`; // dentro de /admin/*
