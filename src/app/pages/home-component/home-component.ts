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
  // Variables de formulaire
  nom: string = "";
  prenom: string = "";
  email: string = "";
  selectedTicket: EventTicket | null = null;
  qrCodeImage: string | null = null;

  tickets: EventTicket[] = [];
  payment: Payment = { email: '', name: '', surname: '', ticketId: '' };

  // Injections
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
        }
      },
      error: (err) => console.error("Erreur tickets", err)
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
          this.toast.show('Paiement validé ! Envoi du ticket...', 'alert-success', 5000);

          // Génération et Envoi
          await this.generateQRCode();
          const pdfBase64 = this.creerFichierPDF();

          if (pdfBase64) {
            this.envoyerTicketParMail(pdfBase64);
          } else {
            this.loader.hide();
          }

          // Nettoyage après succès
          sessionStorage.removeItem('pending_reservation');
        } else {
          this.loader.hide();
          this.toast.show('Paiement non confirmé.', 'alert-info', 5000);
        }
      },
      error: (err) => {
        this.loader.hide();
        this.toast.show('Erreur de vérification', 'alert-error', 3000);
      }
    });
  }

  async generateQRCode() {
    const data = `Ticket: ${this.selectedTicket?.nom}\nClient: ${this.nom} ${this.prenom}\nEmail: ${this.email}`;
    try {
      this.qrCodeImage = await QRCode.toDataURL(data, { width: 300, margin: 2 });
      this.cdr.detectChanges();
    } catch (err) {
      console.error("Erreur QR", err);
    }
  }

  creerFichierPDF(): string | null {
    if (!this.qrCodeImage) return null;

    // 1. Format Paysage (Landscape) - Format type ticket cinéma/concert (210x70mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [210, 70]
    });

    // --- PARTIE GAUCHE : IMAGE & TITRE ---
    // Fond noir pour la zone image (si l'image ne couvre pas tout)
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 140, 70, 'F');

    // Si tu as une image d'événement, tu peux l'ajouter ici :
    // doc.addImage(this.selectedTicket?.image, 'JPEG', 0, 0, 140, 70);

    // Texte sur l'image (Artist / Event Name)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(this.selectedTicket?.nom?.toUpperCase() || 'NAME ARTIST', 10, 50);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(this.selectedTicket?.lieu || 'DOWNTOWN ARENA, NEW YORK', 10, 58);

    // --- PARTIE DROITE : INFOS & QR CODE ---
    // Fond blanc pour la zone de droite
    doc.setFillColor(255, 255, 255);
    doc.rect(140, 0, 70, 70, 'F');

    // Petit texte d'entête
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text("A SPECIAL GIFT FOR YOU", 175, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${this.prenom} ${this.nom}`.toUpperCase(), 175, 15, { align: 'center' });

    // Détails Admission
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("ADMISSION", 145, 25);
    doc.setFont("helvetica", "bold");
    doc.text("RESERVED", 145, 29);

    // Date et Heure
    doc.setFontSize(11);
    const dateStr = this.selectedTicket?.date ? new Date(this.selectedTicket.date).toLocaleDateString() : '12/JAN/2026';
    doc.text(`7:00 PM  ${dateStr}`, 145, 42);

    // QR Code à droite
    doc.addImage(this.qrCodeImage, 'PNG', 168, 48, 18, 18);

    // Texte vertical "ADMIT ONE" sur le bord droit
    doc.setFillColor(0, 0, 0);
    doc.rect(195, 0, 15, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    // Rotation pour le texte vertical
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
      next: () => {
        this.loader.hide();
        this.toast.show('Ticket envoyé par mail !', 'alert-success', 5000);
      },
      error: () => {
        this.loader.hide();
        this.toast.show("Erreur d'envoi mail", 'alert-error', 3000);
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

    if (!this.nom || !this.prenom || !this.email) {
      this.toast.show('Champs requis', 'alert-error', 3000);
      return;
    }

    // SAUVEGARDE AVANT REDIRECTION
    const backup = { nom: this.nom, prenom: this.prenom, email: this.email, selectedTicket: this.selectedTicket };
    sessionStorage.setItem('pending_reservation', JSON.stringify(backup));

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
          this.toast.show('Erreur paiement', 'alert-error', 3000);
        }
      },
      error: () => this.loader.hide()
    });
  }
}