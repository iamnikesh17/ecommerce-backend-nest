import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ProductTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        // Map raw rows into clean objects
        const transformed = data.products.map((row: Record<string, any>) => ({
          id: row.product_id,
          title: row.product_title,
          description: row.product_description,
          price: row.product_price,
          stock: row.product_stock,
          images: row.product_images,
          createdAt: row.product_createdAt,
          updatedAt: row.product_updatedAt,
          category: {
            id: row.category_id,
            name: row.category_name,
            description: row.category_description,
          },
          totalSold: Number(row.totalSold),
        }));

        return { ...data, products: transformed };
      }),
    );
  }
}
