import apiClient from './client'
import type { IScrapingJob } from '@/types'

export const jobsApi = {
  async obter(jobId: string): Promise<IScrapingJob> {
    const { data } = await apiClient.get<IScrapingJob>(`/jobs/${jobId}`)
    return data
  },
}
