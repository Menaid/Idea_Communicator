# 📊 PGAdmin Setup Guide

## Anslut till Docker PostgreSQL från PGAdmin

### Steg 1: Öppna PGAdmin
1. Starta PGAdmin på din dator
2. Högerklicka på "Servers" i vänstra panelen
3. Välj "Create" > "Server..."

### Steg 2: General Tab
- **Name**: Idea Communicator DB
- **Server Group**: Servers

### Steg 3: Connection Tab
- **Host**: localhost
- **Port**: 5432  
- **Database**: ideacomm
- **Username**: ideacomm_user
- **Password**: [ditt POSTGRES_PASSWORD från .env]

### Steg 4: Advanced (Säkerhetsalternativ)
- **Save password**: Ja (för utveckling)
- **SSL Mode**: Prefer (för utveckling)

### Steg 5: Spara och Anslut
1. Klicka "Save"
2. Servern ska nu visas under "Servers"
3. Expandera: Servers > Idea Communicator DB > Databases > ideacomm

## Säkerhetsaspekter (ISO 27001:2022)
- **A.9.4.3 Password Management**: Använd starkt lösenord
- **A.13.1.1 Network Controls**: Endast localhost access i utveckling  
- **A.9.2.1 User Registration**: Begränsat till development team

## Troubleshooting
**Problem**: "Could not connect to server"
**Lösning**: 
1. Kontrollera att Docker containers körs: `docker-compose ps`
2. Testa anslutning: `docker exec ideacomm-db psql -U ideacomm_user -d ideacomm`
3. Kontrollera firewall/antivirus blockering av port 5432

**Problem**: "Password authentication failed"  
**Lösning**: Kontrollera POSTGRES_PASSWORD i .env filen
