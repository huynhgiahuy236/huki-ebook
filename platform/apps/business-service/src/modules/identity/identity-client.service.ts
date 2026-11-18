import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class IdentityClientService {
  private get baseUrl() {
    return (process.env.IDENTITY_SERVICE_URL || `http://localhost:${process.env.IDENTITY_SERVICE_PORT || 3001}`).replace(/\/$/, '');
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    const key = process.env.INTERNAL_SERVICE_KEY;
    if (!key) throw new ServiceUnavailableException('Identity internal service key is not configured');
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/internal/users/${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-internal-service-key': key },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const message = (await response.text()).slice(0, 300);
        throw new Error(`Identity service returned ${response.status}: ${message}`);
      }
      const result = await response.json();
      return result.data as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(`Identity service request failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  lookupByEmail(email: string): Promise<{ id: string; role: string } | null> {
    return this.request('lookup-by-email', 'POST', { email });
  }
  createMemberAccount(input: { fullName: string; email: string; phone?: string | null; password: string }): Promise<{ id: string; role: string }> {
    return this.request('member-accounts', 'POST', input);
  }
  prepareMemberAccess(id: string): Promise<{ id: string; role: string }> {
    return this.request(`${encodeURIComponent(id)}/member-access`, 'PATCH');
  }
  resetPassword(id: string, password: string): Promise<{ id: string }> {
    return this.request(`${encodeURIComponent(id)}/password`, 'PATCH', { password });
  }
  setBusinessRole(id: string): Promise<{ id: string; role: string }> {
    return this.request(`${encodeURIComponent(id)}/business-role`, 'PATCH');
  }
  async getProfiles(userIds: string[]): Promise<Array<{ id: string; fullName: string; email: string; phone: string | null; avatar: string | null; status?: string }>> {
    return this.request('profiles', 'POST', { userIds });
  }
}
