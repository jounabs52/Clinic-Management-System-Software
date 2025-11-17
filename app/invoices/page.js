// app/invoices/page.js
import { redirect } from 'next/navigation';

export default function InvoicesHomePage() {
    // This file ensures that the parent route automatically goes to the list view.
    redirect('/invoices/list');
}