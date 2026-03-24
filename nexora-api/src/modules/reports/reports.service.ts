import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';

@Injectable()
export class ReportsService {
    constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    ) {}

    async getDashboard(companyId: string) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [total, authorized, rejected, pending, error] = await Promise.all([
        this.invoiceRepo.count({ where: { companyId } }),
        this.invoiceRepo.count({ where: { companyId, status: InvoiceStatus.AUTHORIZED } }),
        this.invoiceRepo.count({ where: { companyId, status: InvoiceStatus.REJECTED } }),
        this.invoiceRepo.count({ where: { companyId, status: InvoiceStatus.PENDING } }),
        this.invoiceRepo.count({ where: { companyId, status: InvoiceStatus.ERROR } }),
    ]);

    const monthInvoices = await this.invoiceRepo.find({
        where: {
        companyId,
        status: InvoiceStatus.AUTHORIZED,
        issueDate: Between(firstDay, lastDay) as any,
        },
    });

    const monthTotal = monthInvoices.reduce(
        (acc, inv) => acc + Number(inv.total), 0,
    );

    return {
        summary: { total, authorized, rejected, pending, error },
        currentMonth: {
        invoiceCount: monthInvoices.length,
        totalAmount: monthTotal.toFixed(2),
        period: `${now.getMonth() + 1}/${now.getFullYear()}`,
        },
    };
    }

    async getSalesReport(companyId: string, dateFrom: string, dateTo: string) {
    const invoices = await this.invoiceRepo.find({
        where: {
        companyId,
        status: InvoiceStatus.AUTHORIZED,
        issueDate: Between(new Date(dateFrom), new Date(dateTo)) as any,
        },
        relations: ['customer'],
        order: { issueDate: 'DESC' },
    });

    const totalAmount = invoices.reduce(
        (acc, inv) => acc + Number(inv.total), 0,
    );
    const totalTax = invoices.reduce(
        (acc, inv) => acc + Number(inv.taxAmount), 0,
    );

    return {
        period: { from: dateFrom, to: dateTo },
        count: invoices.length,
        totalAmount: totalAmount.toFixed(2),
        totalTax: totalTax.toFixed(2),
        invoices: invoices.map((inv) => ({
        id: inv.id,
        sequential: inv.sequential,
        issueDate: inv.issueDate,
        customer: inv.customer?.fullName,
        total: inv.total,
        })),
    };
    }
}