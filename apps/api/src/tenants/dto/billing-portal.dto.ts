import { IsOptional, IsString } from 'class-validator';

export class BillingPortalDto {
  // URL para onde o Stripe devolve o utilizador após o portal (página /conta).
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
