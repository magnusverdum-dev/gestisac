use crate::config::PersistenceStatus;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub service: &'static str,
    pub status: &'static str,
    pub persistence: PersistenceStatus,
}

#[derive(Debug, Serialize)]
pub struct VersionResponse {
    pub name: String,
    pub version: String,
    pub environment: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginationParams {
    #[serde(default = "default_page")]
    pub page: usize,
    #[serde(default = "default_page_size")]
    pub page_size: usize,
    #[serde(default)]
    pub search: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub page: usize,
    pub page_size: usize,
    pub total: usize,
    pub total_pages: usize,
}

impl PaginationParams {
    pub fn normalized_page(&self) -> usize {
        self.page.max(1)
    }

    pub fn normalized_page_size(&self) -> usize {
        self.page_size.clamp(1, 100)
    }
}

pub fn paginate<T: Clone + Serialize>(items: &[T], params: &PaginationParams) -> Paginated<T> {
    let search = params.search.trim().to_lowercase();
    let filtered_items;
    let items = if search.is_empty() {
        items
    } else {
        filtered_items = items
            .iter()
            .filter(|item| {
                serde_json::to_string(item)
                    .map(|value| value.to_lowercase().contains(&search))
                    .unwrap_or(false)
            })
            .cloned()
            .collect::<Vec<_>>();
        &filtered_items
    };
    let page = params.normalized_page();
    let page_size = params.normalized_page_size();
    let total = items.len();
    let start = page.saturating_sub(1).saturating_mul(page_size);
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(page_size)
    };
    let page_items = items.iter().skip(start).take(page_size).cloned().collect();

    Paginated {
        items: page_items,
        page,
        page_size,
        total,
        total_pages,
    }
}

fn default_page() -> usize {
    1
}

fn default_page_size() -> usize {
    50
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pagination_limits_page_size_and_returns_requested_slice() {
        let items = vec![1, 2, 3, 4, 5];
        let params = PaginationParams {
            page: 2,
            page_size: 2,
            search: String::new(),
        };

        let page = paginate(&items, &params);

        assert_eq!(page.items, vec![3, 4]);
        assert_eq!(page.page, 2);
        assert_eq!(page.page_size, 2);
        assert_eq!(page.total, 5);
        assert_eq!(page.total_pages, 3);
    }

    #[test]
    fn pagination_normalizes_empty_or_extreme_input() {
        let items = vec![1, 2, 3];
        let params = PaginationParams {
            page: 0,
            page_size: 500,
            search: String::new(),
        };

        let page = paginate(&items, &params);

        assert_eq!(page.items, vec![1, 2, 3]);
        assert_eq!(page.page, 1);
        assert_eq!(page.page_size, 100);
    }

    #[test]
    fn pagination_filters_by_serialized_content_when_search_is_present() {
        let items = vec!["Vila Verde".to_string(), "Jardins do Tejo".to_string()];
        let params = PaginationParams {
            page: 1,
            page_size: 10,
            search: "tejo".to_string(),
        };

        let page = paginate(&items, &params);

        assert_eq!(page.items, vec!["Jardins do Tejo".to_string()]);
        assert_eq!(page.total, 1);
    }
}
