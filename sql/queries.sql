SELECT orden, numero, COUNT(numero) as cantidad FROM monazos GROUP BY orden, numero

SELECT sorteo, orden, numero FROM monazos ORDER BY sorteo, orden

SELECT numero, COUNT() as cantidad FROM lottos GROUP BY numero ORDER BY cantidad DESC
