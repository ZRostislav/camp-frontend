import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  get<T>(path: string, params?: any) {
    let p = new HttpParams();
    if (params)
      Object.keys(params).forEach((k) => {
        if (params[k] != null) p = p.set(k, params[k]);
      });
    return this.http.get<T>(`${this.base}${path}`, {
      headers: this.headers(),
      params: p,
    });
  }

  post<T>(path: string, body: any) {
    return this.http.post<T>(`${this.base}${path}`, body, {
      headers: this.headers(),
    });
  }

  put<T>(path: string, body: any) {
    return this.http.put<T>(`${this.base}${path}`, body, {
      headers: this.headers(),
    });
  }

  patch<T>(path: string, body: any) {
    return this.http.patch<T>(`${this.base}${path}`, body, {
      headers: this.headers(),
    });
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.base}${path}`, {
      headers: this.headers(),
    });
  }

  // Для multipart/form-data (загрузка файлов).
  // Content-Type НЕ указываем — Angular выставит его сам с boundary.
  postFormData<T>(path: string, body: FormData) {
    return this.http.post<T>(`${this.base}${path}`, body, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.token ?? ''}`,
      }),
    });
  }
}
