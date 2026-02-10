export interface EventTicket {
  id: string;
  nom: string;
  lieu: string;
  date: Date;
  prixUnitaire: number;
  quantite: number;
  image: string;
  categorie: string;
}