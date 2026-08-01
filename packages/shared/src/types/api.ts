export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    role: 'manager' | 'sales_rep'
  }
}
