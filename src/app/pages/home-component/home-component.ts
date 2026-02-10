import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from "lucide-angular";
import { FormsModule } from '@angular/forms';
import { EventTicket } from '../../models/ticket';
import { TicketService } from '../../services/ticket/ticket-service';
import { PayementService } from '../../services/payement/payement-service';
import { ToastService } from '../../toast-component/toast-service';
import { LoadingService } from '../../loader-component/loader-service';
import { Payment } from '../../models/payment';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './home-component.html'
})

export class HomeComponent implements OnInit {
  nom: string = "";
  prenom: string = "";
  email: string = "";
  selectedTicket: EventTicket | null = null;
  qrCodeImage: string | null = null;

  tickets: EventTicket[] = [];
  payment: Payment = { email: '', name: '', surname: '', ticketId: '' };

  ticketService = inject(TicketService);
  paymentService = inject(PayementService);
  private toast = inject(ToastService);
  private loader = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.getAllTicket();

    const savedData = sessionStorage.getItem('pending_reservation');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      this.nom = parsed.nom;
      this.prenom = parsed.prenom;
      this.email = parsed.email;
      this.selectedTicket = parsed.selectedTicket;
      this.cdr.detectChanges();
    }

    this.checkPaymentCallback();
  }

  getAllTicket() {
    this.ticketService.allTicket().subscribe({
      next: (res) => {
        if (res.status) {
          this.tickets = res.data;
          this.cdr.detectChanges();
        } else {
          console.error("Erreur API Tickets :", res.message);
          this.toast.show("Impossible de charger les billets.", 'alert-error', 3000);
        }
      },
      error: (err) => {
        console.error("Erreur réseau/serveur Tickets :", err);
        this.toast.show("Erreur de connexion au serveur.", 'alert-error', 3000);
      }
    });
  }

  checkPaymentCallback() {
    this.route.queryParams.subscribe(params => {
      const transactionId = params['id'];
      if (transactionId) {
        this.callback(transactionId);
      }
    });
  }

  callback(id: string) {
    this.loader.show();
    this.paymentService.callback(id).subscribe({
      next: async (res) => {
        if (res.status) {
          this.toast.show('Paiement validé ! Génération du ticket...', 'alert-success', 5000);

          try {
            await this.generateQRCode();
            const pdfBase64 = this.creerFichierPDF();

            if (pdfBase64) {
              this.envoyerTicketParMail(pdfBase64);
            } else {
              throw new Error("Le PDF n'a pas pu être généré.");
            }
          } catch (err) {
            this.loader.hide();
            console.error("Erreur lors de la création du ticket :", err);
            this.toast.show("Erreur lors de la création visuelle du ticket.", 'alert-error', 5000);
          }

          sessionStorage.removeItem('pending_reservation');
        } else {
          this.loader.hide();
          console.error("Échec validation paiement :", res);
          this.toast.show(res.message || 'Paiement non confirmé.', 'alert-info', 5000);
        }
      },
      error: (err) => {
        this.loader.hide();
        console.error("Erreur Callback Paiement :", err);
        this.toast.show('Erreur lors de la vérification du paiement.', 'alert-error', 4000);
      }
    });
  }

  async generateQRCode() {
    const data = `Ticket: ${this.selectedTicket?.nom}\nClient: ${this.nom} ${this.prenom}\nEmail: ${this.email}`;
    try {
      this.qrCodeImage = await QRCode.toDataURL(data, { width: 300, margin: 2 });
      this.cdr.detectChanges();
    } catch (err) {
      console.error("Erreur Génération QR Code :", err);
      throw err;
    }
  }

  creerFichierPDF(): string | null {
    if (!this.qrCodeImage) return null;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 70]
    });

    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 140, 70, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(this.selectedTicket?.nom?.toUpperCase() || 'ÉVÉNEMENT', 10, 50);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(this.selectedTicket?.lieu || 'LIEU À DÉFINIR', 10, 58);

    doc.setFillColor(255, 255, 255);
    doc.rect(140, 0, 70, 70, 'F');

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text("BILLET RÉSERVÉ POUR", 40, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${this.prenom} ${this.nom}`.toUpperCase(), 40, 15, { align: 'center' });

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    doc.text("ADMISSION", 145, 25);
    doc.text("RESERVED", 145, 29);

    doc.setFontSize(11);
    const dateStr = this.selectedTicket?.date ? new Date(this.selectedTicket.date).toLocaleDateString() : 'À DÉTERMINER';
    doc.text(`DATE: ${dateStr}`, 145, 42);

    doc.addImage(this.qrCodeImage, 'PNG', 40, 48, 18, 18);

    doc.setFillColor(0, 0, 0);
    doc.rect(195, 0, 15, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("ADMIT ONE", 205, 35, { angle: 90, align: 'center' });

    return doc.output('datauristring');
  }

  envoyerTicketParMail(pdfBase64: string) {
    const payload = {
      email: this.email,
      name: `${this.prenom} ${this.nom}`,
      eventName: this.selectedTicket?.nom || 'Événement',
      pdfBase64: pdfBase64
    };

    this.ticketService.sendTicketEmail(payload).subscribe({
      next: (res) => {
        this.loader.hide();
        if (res.status) {
          this.toast.show('Ticket envoyé par mail avec succès !', 'alert-success', 5000);
        } else {
          console.error("Erreur serveur envoi mail :", res.message);
          this.toast.show("Le mail n'a pas pu partir, mais votre paiement est validé.", 'alert-warning', 7000);
        }
      },
      error: (err) => {
        this.loader.hide();
        console.error("Erreur réseau Envoi Mail :", err);
        this.toast.show("Erreur d'envoi du mail. Veuillez contacter le support.", 'alert-error', 6000);
      }
    });
  }

  reserver(ticket: EventTicket) {
    this.selectedTicket = ticket;
    const modal = document.getElementById('payment_modal') as HTMLDialogElement;
    modal.showModal();
  }

  validerReservation(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const modal = document.getElementById('payment_modal') as HTMLDialogElement;

    if (!this.nom || !this.prenom || !this.email) {
      modal.close();
      this.toast.show('Veuillez remplir tous les champs.', 'alert-warning', 3000);
      return;
    }

    const backup = { nom: this.nom, prenom: this.prenom, email: this.email, selectedTicket: this.selectedTicket };
    sessionStorage.setItem('pending_reservation', JSON.stringify(backup));

    modal.close();
    this.loader.show();
    this.payment.email = this.email;
    this.payment.name = this.nom;
    this.payment.surname = this.prenom;
    this.payment.ticketId = this.selectedTicket?.id;

    this.paymentService.createTransaction(this.payment).subscribe({
      next: (res) => {
        if (res.status) {
          window.location.href = res.data.paymentUrl;
        } else {
          this.loader.hide();
          console.error("Erreur Création Transaction :", res);
          this.toast.show('Erreur lors de l\'initialisation du paiement.', 'alert-error', 3000);
        }
      },
      error: (err) => {
        this.loader.hide();
        console.error("Erreur Réseau Paiement :", err);
        this.toast.show('Impossible de joindre le service de paiement.', 'alert-error', 3000);
      }
    });
  }
}