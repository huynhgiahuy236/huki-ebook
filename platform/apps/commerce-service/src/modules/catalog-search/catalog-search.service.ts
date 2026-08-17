import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { normalizeCatalogText } from '../../common/catalog-text.util';
import { paginate } from '../../common/pagination.util';
import { CatalogSearchQueryDto, CatalogSearchType } from './dto/catalog-search-query.dto';

interface CatalogSearchRow {
  type: CatalogSearchType;
  id: string;
  name: string;
  slug: string;
  score: string | number;
  total_count: string | number;
}

@Injectable()
export class CatalogSearchService {
  constructor(private readonly dataSource: DataSource) {}

  async search(query: CatalogSearchQueryDto) {
    const normalizedQuery = normalizeCatalogText(query.q);
    if (normalizedQuery.length < 2) {
      throw new BadRequestException('Search query must contain at least 2 searchable characters');
    }
    const types = query.types?.length
      ? query.types
      : Object.values(CatalogSearchType);
    const offset = (query.page - 1) * query.limit;

    const rows: CatalogSearchRow[] = await this.dataSource.query(
      `WITH catalog_results AS (
         SELECT 'CATEGORY'::text AS type, id, name, slug,
           CASE WHEN normalized_name = $1 THEN 3.0
                WHEN normalized_name LIKE $1 || '%' THEN 2.0
                ELSE 1.0 END
           + ts_rank(search_vector, websearch_to_tsquery('simple', $1))
           + similarity(normalized_name, $1) AS score
         FROM categories
         WHERE is_active = true AND deleted_at IS NULL
           AND (search_vector @@ websearch_to_tsquery('simple', $1)
             OR normalized_name % $1 OR normalized_name LIKE $1 || '%')
         UNION ALL
         SELECT 'AUTHOR'::text AS type, id, name, slug,
           CASE WHEN normalized_name = $1 THEN 3.0
                WHEN normalized_name LIKE $1 || '%' THEN 2.0
                ELSE 1.0 END
           + ts_rank(search_vector, websearch_to_tsquery('simple', $1))
           + similarity(normalized_name, $1) AS score
         FROM authors
         WHERE is_active = true AND deleted_at IS NULL
           AND (search_vector @@ websearch_to_tsquery('simple', $1)
             OR normalized_name % $1 OR normalized_name LIKE $1 || '%')
         UNION ALL
         SELECT 'PUBLISHER'::text AS type, id, name, slug,
           CASE WHEN normalized_name = $1 THEN 3.0
                WHEN normalized_name LIKE $1 || '%' THEN 2.0
                ELSE 1.0 END
           + ts_rank(search_vector, websearch_to_tsquery('simple', $1))
           + similarity(normalized_name, $1) AS score
         FROM publishers
         WHERE is_active = true AND deleted_at IS NULL
           AND (search_vector @@ websearch_to_tsquery('simple', $1)
             OR normalized_name % $1 OR normalized_name LIKE $1 || '%')
       )
       SELECT type, id, name, slug, score, COUNT(*) OVER() AS total_count
       FROM catalog_results
       WHERE type = ANY($2::text[])
       ORDER BY score DESC, name ASC
       LIMIT $3 OFFSET $4`,
      [normalizedQuery, types, query.limit, offset],
    );

    const data = rows.map(({ total_count: _totalCount, ...row }) => ({
      ...row,
      score: Number(row.score),
    }));
    const total = Number(rows[0]?.total_count ?? 0);
    return paginate(data, total, query.page, query.limit);
  }
}
