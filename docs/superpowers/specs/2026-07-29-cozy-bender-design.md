# cozy-bender — outil générique pour l'API Bender

Date : 2026-07-29

## Contexte

`cozy-app-bender-updater` est un script bash mono-usage : il déploie une app Cozy
sur une liste d'instances via `PUT /instances/{env}/{domain}/apps/{slug}`. Un
wrapper Node (`bin/cozy-app-bender-updater.js`) l'expose au dispatcher
`twake-tools`.

Bender expose beaucoup d'autres endpoints utiles (feature flags, konnectors,
maintenance, debug, context, jobs, registry…). Le besoin immédiat est de poser
des feature flags sur une liste d'instances. Le besoin structurel est d'avoir un
socle où chaque nouvel endpoint coûte quelques dizaines de lignes.

Le tool n'a jamais été publié ni utilisé en dehors de ce dépôt : aucune
contrainte de rétrocompatibilité.

## Ce que dit l'API Bender

Spec OpenAPI : `GET https://bender.cozycloud.cc/api/spec` (authentifiée ;
découvrable depuis `https://bender.cozycloud.cc/api/doc/`).

| Endpoint | Rôle |
|---|---|
| `PUT /instances/{env}/{domain}/apps/{slug}` | déploie une app (utilisé aujourd'hui) |
| `GET /instances/{env}/{domain}/features` | lit les flags d'une instance et leurs sources |
| `PUT /instances/{env}/{domain}/features` | pose **un** flag sur une instance |
| `PUT /instances/{env}/features` | pose un flag au niveau environnement (`defaults` / `ratio`) |

Corps du `PUT` des features :

```json
{ "name": "banks.should-show-transfers", "value": "true", "source": "instance", "context": "cozy_default" }
```

- `source` : `instance` | `defaults` | `ratio` (l'endpoint env-level n'accepte que `defaults` et `ratio`).
- `context` : requis uniquement pour `source: ratio`.
- `value: null` supprime le flag.
- **Un seul flag par requête** : poser M flags sur N instances coûte N×M appels.

Authentification : `Authorization: Bearer <token>`, token personnel obtenu sur
https://bender.cozycloud.cc/ → Profile → « Personal API token ».

### Ambiguïté à lever avant d'implémenter

La spec déclare `value` de type `string` avec pour exemple `"true"`, tout en la
décrivant comme « la valeur du flag en JSON ». Le corps attendu est donc soit
`{"value": "true"}` (JSON sérialisé dans une chaîne), soit `{"value": true}`
(valeur JSON native).

**À trancher empiriquement en toute première tâche d'implémentation** : poser un
flag jetable sur une instance de dev, le relire via `GET .../features`, puis le
supprimer avec `null`. Le résultat conditionne l'encodage dans `src/flags.js` et
doit être noté en commentaire dans ce fichier.

**Mise à jour (implémentation) :** cette sonde n'a pas été exécutée — aucune
instance de dev ni token n'était disponible. Le code livré part sur l'encodage
JSON natif (`encodeFlagValue` identité), **non confirmé** contre un Bender
réel ; la tâche 1 du plan reste donc ouverte.

## Décisions

| Sujet | Décision |
|---|---|
| Nom | `cozy-bender` (remplace `cozy-app-bender-updater`) |
| Forme | outil unique à sous-commandes, plutôt que plusieurs tools |
| Implémentation | Node 24 natif (`fetch`, `parseArgs`, `node:test`), zéro dépendance npm |
| Entrée | tout en arguments CLI : instances séparées par des virgules, flags en paires `nom=valeur` |
| Portée des flags | `source: instance` uniquement ; `defaults` et `ratio` hors périmètre |
| Ordre des arguments | `<env>` en premier partout, aligné sur les chemins de l'API |
| Rétrocompatibilité | aucune — pas d'alias, pas de garde-fou sur l'ancien ordre |

Sont explicitement hors périmètre : `source: defaults` et `source: ratio`, le
paramètre `context`, les autres endpoints Bender, et toute exécution concurrente
des requêtes. Ils seront ajoutés le jour où le besoin existe.

## Architecture

```
cozy-bender/
  package.json           # zéro dépendance, engines node >=24, test: node --test
  bin/cozy-bender.js     # point d'entrée
  src/cli.js             # dispatch des sous-commandes + usage
  src/client.js          # token, requêtes HTTP, taxonomie des erreurs
  src/output.js          # couleurs, lignes ✔/✘, résumé final
  src/apps.js            # apps update (port de update-app-bender.sh)
  src/flags.js           # flags set / flags list
  test/                  # tests node:test
  README.md
```

`update-app-bender.sh` et `bin/cozy-app-bender-updater.js` sont supprimés ; leur
comportement est porté à l'identique dans `src/apps.js`.

Le dispatcher `twake-tools` découvre les tools par dossier exposant
`bin/<nom-du-dossier>.js` : renommer le dossier suffit, aucune modification de
`bin/twake-tools.js` n'est nécessaire.

**Frontières.** `client.js` ne connaît que HTTP, le token et la forme des erreurs
Bender ; il ignore tout des apps et des flags. `output.js` ne fait que formater
ce qu'on lui donne. `apps.js` et `flags.js` ne contiennent que ce qui est propre
à leur domaine. Ajouter un endpoint Bender = ajouter un `src/<domaine>.js` et une
entrée dans le dispatch de `cli.js`.

## Surface CLI

```
cozy-bender apps update <env> <instances> <slug> <org/repo> [branch] [force]
cozy-bender flags set   <env> <instances> <flag=valeur>...
cozy-bender flags list  <env> <instance>
```

- `<env>` : environnement Bender, ex. `prod`
- `<instances>` : un ou plusieurs domaines séparés par des virgules
- `branch` : défaut `build` ; `force` : `true` (défaut) ou `false`

Exemples :

```bash
npx github:linagora/twake-tools cozy-bender apps update \
    prod a.mycozy.cloud,b.mycozy.cloud home cozy/cozy-home build

npx github:linagora/twake-tools cozy-bender flags set \
    prod a.mycozy.cloud,b.mycozy.cloud \
    banks.show-transfers=true drive.max-upload=100 home.theme=dark

npx github:linagora/twake-tools cozy-bender flags list prod a.mycozy.cloud
```

Invoqué sans sous-commande — ou avec une sous-commande inconnue — l'outil
affiche l'usage des trois commandes et sort en code 1.

## Parsing des valeurs de flags

Chaque argument `nom=valeur` est découpé au **premier** `=` (une valeur JSON peut
en contenir). La valeur passe par `JSON.parse` ; si le parsing échoue, elle est
prise comme chaîne brute.

| Argument | Valeur | Effet |
|---|---|---|
| `banks.show-transfers=true` | `true` | booléen |
| `drive.max-upload=100` | `100` | nombre |
| `home.theme=dark` | `"dark"` | repli chaîne, pas besoin de quoter |
| `home.theme='"dark"'` | `"dark"` | identique |
| `some.list=[1,2]` | `[1,2]` | tableau |
| `old.flag=null` | `null` | **supprime le flag** |
| `some.flag=` | `""` | chaîne vide |
| `some.flag` (sans `=`) | — | erreur d'usage, rien n'est envoyé |

Le repli sur chaîne évite le piège de quoting shell le plus courant. Corollaire
assumé : `nom=null` supprime toujours le flag ; la chaîne littérale `"null"`
s'écrit `nom='"null"'`.

Les arguments sont tous parsés **avant** le premier appel réseau : une paire
malformée fait échouer la commande sans avoir rien modifié.

## Exécution et sortie

`flags set` effectue `instances × flags` appels séquentiels, un flag par requête.
Le séquentiel est un choix assumé : il garde une sortie lisible ligne à ligne et
correspond au volume réel (quelques instances, quelques flags). Une concurrence
limitée s'ajoutera si le besoin apparaît.

Comme aujourd'hui, un échec n'interrompt pas la suite : les opérations restantes
sont tentées, les cibles en échec sont listées à la fin, et le code de sortie
est 1 dès qu'au moins une opération a échoué.

```
Setting 3 flag(s) on 2 instance(s) (env: prod)

a.mycozy.cloud
  ✔ banks.show-transfers = true
  ✔ home.theme = "dark"
  ✘ drive.max-upload — HTTP 404, Instance not found
b.mycozy.cloud
  ✔ banks.show-transfers = true
  ✔ home.theme = "dark"
  ✔ drive.max-upload = 100

5/6 flag update(s) applied — failed: a.mycozy.cloud (drive.max-upload)
```

`apps update` garde sa sortie actuelle (une ligne par instance, version et état
extraits de la réponse, puis résumé).

`flags list` affiche les flags effectifs de l'instance, puis leur origine à
partir du tableau `sources` de la réponse (qui distingue
`io.cozy.settings.flags.instance` des defaults et des ratios). C'est le moyen de
vérifier ce qu'un `set` a réellement produit.

Les couleurs ne sont émises que si la sortie est un TTY. `BENDER_VERBOSE=1`
affiche la réponse brute de chaque appel.

## Gestion des erreurs

Centralisée dans `client.js`, commune à toutes les sous-commandes :

| Cas | Comportement |
|---|---|
| `BENDER_TOKEN` absent | message pointant vers Profile → « Personal API token », sortie 1 avant tout appel |
| Échec réseau | « request failed (could not reach Bender) » |
| `401`, `403`, `3xx` | « authentication failed (HTTP n) — check your Bender token » |
| Autre non-2xx | message extrait du corps : `.error`, `.errors[0].detail`, `.errors[0].title`, `.message` ; à défaut, corps tronqué à 160 caractères |
| Corps vide / HTML | « no response body » / « unexpected HTML response (run again with BENDER_VERBOSE=1) » |

Le token est lu depuis `BENDER_TOKEN`. Le `HARDCODED_TOKEN` du script bash n'est
pas porté : il invitait à committer un secret.

Le repli dégradé « installe `jq` pour plus de détails » disparaît — en Node le
corps est toujours parsé, donc plus de dépendance externe ni de mode dégradé.

## Tests

`node:test` (intégré), `npm test` → `node --test`. Les tests portent sur les
parties pures, là où les bugs se logent :

- parsing des paires `nom=valeur` : premier `=`, repli chaîne, `null`, valeur
  vide, absence de `=`
- construction de l'URL et du corps de requête pour `apps update` et `flags set`
- extraction du message d'erreur selon la forme du corps de réponse (JSON
  d'erreur, corps vide, HTML, texte brut)
- comptage du résumé et code de sortie retournés

Les appels réseau sont testés en injectant un `fetch` de substitution dans
`client.js`. Aucun test ne tape le vrai Bender.

## Documentation

- `cozy-bender/README.md` : réécrit pour les trois sous-commandes, le format des
  valeurs de flags et l'obtention du token.
- `README.md` racine : l'entrée `cozy-app-bender-updater` devient `cozy-bender`,
  avec une description couvrant apps et feature flags.
