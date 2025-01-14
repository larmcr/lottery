SELECT orden, numero, COUNT(numero) as cantidad FROM monazos GROUP BY orden, numero

SELECT sorteo, orden, numero FROM monazos ORDER BY sorteo, orden