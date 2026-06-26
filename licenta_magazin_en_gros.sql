-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gazdă: 127.0.0.1
-- Timp de generare: iun. 16, 2026 la 02:58 PM
-- Versiune server: 10.4.32-MariaDB
-- Versiune PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Bază de date: `licenta_magazin_en_gros`
--

DELIMITER $$
--
-- Proceduri
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `calcul_total_factura` (IN `v_id_factura` INT)   BEGIN
    UPDATE FACTURI 
    SET 
        total_net = (SELECT COALESCE(SUM(total_net), 0) FROM PRODUSE_FACTURA WHERE id_factura = v_id_factura) +
                    (SELECT COALESCE(SUM(total_net), 0) FROM SERVICII_FACTURA WHERE id_factura = v_id_factura) +
                    (SELECT COALESCE(SUM(total_net), 0) FROM OBIECTE_INVENTAR_FACTURA WHERE id_factura = v_id_factura) +
                    (SELECT COALESCE(SUM(total_net), 0) FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = v_id_factura),
        suma_tva = (SELECT COALESCE(SUM(suma_tva), 0) FROM PRODUSE_FACTURA WHERE id_factura = v_id_factura) +
                   (SELECT COALESCE(SUM(suma_tva), 0) FROM SERVICII_FACTURA WHERE id_factura = v_id_factura) +
                   (SELECT COALESCE(SUM(suma_tva), 0) FROM OBIECTE_INVENTAR_FACTURA WHERE id_factura = v_id_factura) +
                   (SELECT COALESCE(SUM(suma_tva), 0) FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = v_id_factura),
        total_brut = (SELECT COALESCE(SUM(total_brut), 0) FROM PRODUSE_FACTURA WHERE id_factura = v_id_factura) +
                     (SELECT COALESCE(SUM(total_brut), 0) FROM SERVICII_FACTURA WHERE id_factura = v_id_factura) +
                     (SELECT COALESCE(SUM(total_brut), 0) FROM OBIECTE_INVENTAR_FACTURA WHERE id_factura = v_id_factura) +
                     (SELECT COALESCE(SUM(total_brut), 0) FROM MIJLOACE_FIXE_FACTURA WHERE id_factura = v_id_factura)
    WHERE id = v_id_factura;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `genereaza_amortizari_lunare` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_data_intrare DATE;
    DECLARE v_data_sfarsit DATE;
    DECLARE v_valoare_intrare DECIMAL(10,2);
    DECLARE v_tip_amortizare ENUM('liniară', 'accelerată');
    DECLARE v_val_amort_acc DECIMAL(10,2);
    DECLARE v_durata_luni INT;
    DECLARE v_status ENUM('activ', 'casat');
    DECLARE v_data_casare DATE;
    DECLARE v_valoare_actuala DECIMAL(10,2);

    DECLARE cur CURSOR FOR 
        SELECT id, data_intrare, data_sfarsit, valoare_intrare, tip_amortizare, val_amort_acc, durata_viata_luni, status, data_casare, valoare_actuala
        FROM MIJLOACE_FIXE;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_id, v_data_intrare, v_data_sfarsit, v_valoare_intrare, v_tip_amortizare, v_val_amort_acc, v_durata_luni, v_status, v_data_casare, v_valoare_actuala;
        IF done THEN LEAVE read_loop; END IF;

        IF v_status <> 'activ' THEN ITERATE read_loop; END IF;

        block_activ: BEGIN
            DECLARE v_luna_curenta_calcul DATE;
            DECLARE v_ultima_luna_amortizata DATE;
            DECLARE v_suma_de_inregistrat DECIMAL(10,2);
            DECLARE v_numar_luna_amortizare INT;

            SELECT MAX(luna_an) INTO v_ultima_luna_amortizata FROM AMORTIZARI WHERE id_mijloc_fix = v_id;

            IF v_ultima_luna_amortizata IS NULL THEN
                SET v_luna_curenta_calcul = LAST_DAY(DATE_ADD(v_data_intrare, INTERVAL 1 MONTH));
            ELSE
                SET v_luna_curenta_calcul = LAST_DAY(DATE_ADD(v_ultima_luna_amortizata, INTERVAL 1 MONTH));
            END IF;

            calcul_luni: WHILE v_luna_curenta_calcul <= CURDATE() DO
                IF v_valoare_actuala <= 0 THEN LEAVE calcul_luni; END IF;

               IF LAST_DAY(DATE_ADD(v_luna_curenta_calcul, INTERVAL 1 MONTH)) > v_data_sfarsit THEN
                    SET v_suma_de_inregistrat = v_valoare_actuala;
                ELSE
                    SET v_numar_luna_amortizare = TIMESTAMPDIFF(MONTH, v_data_intrare, v_luna_curenta_calcul);
                    IF v_tip_amortizare = 'liniară' THEN
                        SET v_suma_de_inregistrat = v_valoare_intrare / v_durata_luni;
                    ELSEIF v_tip_amortizare = 'accelerată' THEN
                        IF v_numar_luna_amortizare <= 12 THEN
                            SET v_suma_de_inregistrat = v_val_amort_acc / 12;
                        ELSE
                            SET v_suma_de_inregistrat = (v_valoare_intrare - v_val_amort_acc) / (v_durata_luni - 12);
                        END IF;
                    END IF;
                END IF;

                IF v_suma_de_inregistrat > v_valoare_actuala THEN SET v_suma_de_inregistrat = v_valoare_actuala; END IF;

                INSERT INTO AMORTIZARI (id_mijloc_fix, luna_an, valoare_amortizare)
                VALUES (v_id, v_luna_curenta_calcul, v_suma_de_inregistrat);

                SET v_valoare_actuala = v_valoare_actuala - v_suma_de_inregistrat;
                SET v_luna_curenta_calcul = LAST_DAY(DATE_ADD(v_luna_curenta_calcul, INTERVAL 1 MONTH));

                IF v_valoare_actuala = 0 THEN LEAVE calcul_luni; END IF;
            END WHILE calcul_luni;
        END block_activ;
    END LOOP;
    CLOSE cur;
END$$

--
-- Funcții
--
CREATE DEFINER=`root`@`localhost` FUNCTION `GetOrCreateCurrentNC` (`v_data` DATE) RETURNS INT(11)  BEGIN
    DECLARE v_id INT;
    DECLARE v_count INT;
    DECLARE v_numar VARCHAR(20);

    IF v_data IS NULL THEN RETURN NULL; END IF;

    -- finalizare automata nc la sfarsit de zi 
    UPDATE NOTE_CONTABILE SET status = 'finalizată' WHERE data_intocmire < CURDATE() AND status = 'deschisă';

    -- operatiune dintr o zi anterioara (pt amortizari)
    IF v_data < CURDATE() THEN
        -- se cauta nota contabila din acea zi
        SELECT id INTO v_id FROM NOTE_CONTABILE 
        WHERE data_intocmire = v_data 
        ORDER BY id DESC LIMIT 1;
        
        -- daca nu exista nc in acea zi o cream
        IF v_id IS NULL THEN
            SET v_numar = CONCAT('NC', DATE_FORMAT(v_data, '%d%m%y'), '1');
            INSERT INTO NOTE_CONTABILE (numar, data_intocmire, status)
            VALUES (v_numar, v_data, 'finalizată');
            SET v_id = LAST_INSERT_ID();
        END IF;

    -- operatiune din ziua curenta
    ELSE
        -- se cauta o nc deschisa
        SELECT id INTO v_id FROM NOTE_CONTABILE 
        WHERE data_intocmire = v_data AND status = 'deschisă' LIMIT 1;
        
        -- daca nu exista se genereaza una noua
        IF v_id IS NULL THEN
            -- calcul nr nc exitente intr o zi
            SELECT COUNT(*) INTO v_count FROM NOTE_CONTABILE WHERE data_intocmire = v_data;
            
            -- formatul NCddmmyyx
            SET v_numar = CONCAT('NC', DATE_FORMAT(v_data, '%d%m%y'), v_count + 1);
            
            INSERT INTO NOTE_CONTABILE (numar, data_intocmire, status)
            VALUES (v_numar, v_data, 'deschisă');
            SET v_id = LAST_INSERT_ID();
        END IF;
    END IF;

    RETURN v_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `amortizari`
--

CREATE TABLE `amortizari` (
  `id` int(11) NOT NULL,
  `id_mijloc_fix` int(11) NOT NULL,
  `luna_an` date NOT NULL,
  `valoare_amortizare` decimal(10,2) NOT NULL,
  `data_inregistrare` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `amortizari`
--

INSERT INTO `amortizari` (`id`, `id_mijloc_fix`, `luna_an`, `valoare_amortizare`, `data_inregistrare`) VALUES
(1, 1, '2017-09-30', 4166.67, '2026-06-14 18:00:08'),
(2, 1, '2017-10-31', 4166.67, '2026-06-14 18:00:08'),
(3, 1, '2017-11-30', 4166.67, '2026-06-14 18:00:08'),
(4, 1, '2017-12-31', 4166.67, '2026-06-14 18:00:08'),
(5, 1, '2018-01-31', 4166.67, '2026-06-14 18:00:08'),
(6, 1, '2018-02-28', 4166.67, '2026-06-14 18:00:08'),
(7, 1, '2018-03-31', 4166.67, '2026-06-14 18:00:08'),
(8, 1, '2018-04-30', 4166.67, '2026-06-14 18:00:08'),
(9, 1, '2018-05-31', 4166.67, '2026-06-14 18:00:08'),
(10, 1, '2018-06-30', 4166.67, '2026-06-14 18:00:08'),
(11, 1, '2018-07-31', 4166.67, '2026-06-14 18:00:08'),
(12, 1, '2018-08-31', 4166.67, '2026-06-14 18:00:08'),
(13, 1, '2018-09-30', 1041.67, '2026-06-14 18:00:08'),
(14, 1, '2018-10-31', 1041.67, '2026-06-14 18:00:08'),
(15, 1, '2018-11-30', 1041.67, '2026-06-14 18:00:08'),
(16, 1, '2018-12-31', 1041.67, '2026-06-14 18:00:08'),
(17, 1, '2019-01-31', 1041.67, '2026-06-14 18:00:08'),
(18, 1, '2019-02-28', 1041.67, '2026-06-14 18:00:08'),
(19, 1, '2019-03-31', 1041.67, '2026-06-14 18:00:08'),
(20, 1, '2019-04-30', 1041.67, '2026-06-14 18:00:08'),
(21, 1, '2019-05-31', 1041.67, '2026-06-14 18:00:08'),
(22, 1, '2019-06-30', 1041.67, '2026-06-14 18:00:08'),
(23, 1, '2019-07-31', 1041.67, '2026-06-14 18:00:08'),
(24, 1, '2019-08-31', 1041.67, '2026-06-14 18:00:08'),
(25, 1, '2019-09-30', 1041.67, '2026-06-14 18:00:08'),
(26, 1, '2019-10-31', 1041.67, '2026-06-14 18:00:08'),
(27, 1, '2019-11-30', 1041.67, '2026-06-14 18:00:08'),
(28, 1, '2019-12-31', 1041.67, '2026-06-14 18:00:08'),
(29, 1, '2020-01-31', 1041.67, '2026-06-14 18:00:08'),
(30, 1, '2020-02-29', 1041.67, '2026-06-14 18:00:08'),
(31, 1, '2020-03-31', 1041.67, '2026-06-14 18:00:08'),
(32, 1, '2020-04-30', 1041.67, '2026-06-14 18:00:08'),
(33, 1, '2020-05-31', 1041.67, '2026-06-14 18:00:08'),
(34, 1, '2020-06-30', 1041.67, '2026-06-14 18:00:08'),
(35, 1, '2020-07-31', 1041.67, '2026-06-14 18:00:08'),
(36, 1, '2020-08-31', 1041.67, '2026-06-14 18:00:08'),
(37, 1, '2020-09-30', 1041.67, '2026-06-14 18:00:08'),
(38, 1, '2020-10-31', 1041.67, '2026-06-14 18:00:08'),
(39, 1, '2020-11-30', 1041.67, '2026-06-14 18:00:08'),
(40, 1, '2020-12-31', 1041.67, '2026-06-14 18:00:08'),
(41, 1, '2021-01-31', 1041.67, '2026-06-14 18:00:08'),
(42, 1, '2021-02-28', 1041.67, '2026-06-14 18:00:08'),
(43, 1, '2021-03-31', 1041.67, '2026-06-14 18:00:08'),
(44, 1, '2021-04-30', 1041.67, '2026-06-14 18:00:08'),
(45, 1, '2021-05-31', 1041.67, '2026-06-14 18:00:08'),
(46, 1, '2021-06-30', 1041.67, '2026-06-14 18:00:08'),
(47, 1, '2021-07-31', 1041.67, '2026-06-14 18:00:08'),
(48, 1, '2021-08-31', 1041.67, '2026-06-14 18:00:08'),
(49, 1, '2021-09-30', 1041.67, '2026-06-14 18:00:08'),
(50, 1, '2021-10-31', 1041.67, '2026-06-14 18:00:08'),
(51, 1, '2021-11-30', 1041.67, '2026-06-14 18:00:08'),
(52, 1, '2021-12-31', 1041.67, '2026-06-14 18:00:08'),
(53, 1, '2022-01-31', 1041.67, '2026-06-14 18:00:08'),
(54, 1, '2022-02-28', 1041.67, '2026-06-14 18:00:08'),
(55, 1, '2022-03-31', 1041.67, '2026-06-14 18:00:08'),
(56, 1, '2022-04-30', 1041.67, '2026-06-14 18:00:08'),
(57, 1, '2022-05-31', 1041.67, '2026-06-14 18:00:08'),
(58, 1, '2022-06-30', 1041.67, '2026-06-14 18:00:08'),
(59, 1, '2022-07-31', 2083.14, '2026-06-14 18:00:08'),
(60, 2, '2017-09-30', 250.00, '2026-06-14 18:01:12'),
(61, 2, '2017-10-31', 250.00, '2026-06-14 18:01:12'),
(62, 2, '2017-11-30', 250.00, '2026-06-14 18:01:12'),
(63, 2, '2017-12-31', 250.00, '2026-06-14 18:01:12'),
(64, 2, '2018-01-31', 250.00, '2026-06-14 18:01:12'),
(65, 2, '2018-02-28', 250.00, '2026-06-14 18:01:12'),
(66, 2, '2018-03-31', 250.00, '2026-06-14 18:01:12'),
(67, 2, '2018-04-30', 250.00, '2026-06-14 18:01:12'),
(68, 2, '2018-05-31', 250.00, '2026-06-14 18:01:12'),
(69, 2, '2018-06-30', 250.00, '2026-06-14 18:01:12'),
(70, 2, '2018-07-31', 250.00, '2026-06-14 18:01:12'),
(71, 2, '2018-08-31', 250.00, '2026-06-14 18:01:12'),
(72, 2, '2018-09-30', 250.00, '2026-06-14 18:01:12'),
(73, 2, '2018-10-31', 250.00, '2026-06-14 18:01:12'),
(74, 2, '2018-11-30', 250.00, '2026-06-14 18:01:12'),
(75, 2, '2018-12-31', 250.00, '2026-06-14 18:01:12'),
(76, 2, '2019-01-31', 250.00, '2026-06-14 18:01:12'),
(77, 2, '2019-02-28', 250.00, '2026-06-14 18:01:12'),
(78, 2, '2019-03-31', 250.00, '2026-06-14 18:01:12'),
(79, 2, '2019-04-30', 250.00, '2026-06-14 18:01:12'),
(80, 2, '2019-05-31', 250.00, '2026-06-14 18:01:12'),
(81, 2, '2019-06-30', 250.00, '2026-06-14 18:01:12'),
(82, 2, '2019-07-31', 500.00, '2026-06-14 18:01:12'),
(83, 3, '2017-09-30', 104.17, '2026-06-14 18:01:53'),
(84, 3, '2017-10-31', 104.17, '2026-06-14 18:01:53'),
(85, 3, '2017-11-30', 104.17, '2026-06-14 18:01:53'),
(86, 3, '2017-12-31', 104.17, '2026-06-14 18:01:53'),
(87, 3, '2018-01-31', 104.17, '2026-06-14 18:01:53'),
(88, 3, '2018-02-28', 104.17, '2026-06-14 18:01:53'),
(89, 3, '2018-03-31', 104.17, '2026-06-14 18:01:53'),
(90, 3, '2018-04-30', 104.17, '2026-06-14 18:01:53'),
(91, 3, '2018-05-31', 104.17, '2026-06-14 18:01:53'),
(92, 3, '2018-06-30', 104.17, '2026-06-14 18:01:53'),
(93, 3, '2018-07-31', 104.17, '2026-06-14 18:01:53'),
(94, 3, '2018-08-31', 104.17, '2026-06-14 18:01:53'),
(95, 3, '2018-09-30', 104.17, '2026-06-14 18:01:53'),
(96, 3, '2018-10-31', 104.17, '2026-06-14 18:01:53'),
(97, 3, '2018-11-30', 104.17, '2026-06-14 18:01:53'),
(98, 3, '2018-12-31', 104.17, '2026-06-14 18:01:53'),
(99, 3, '2019-01-31', 104.17, '2026-06-14 18:01:53'),
(100, 3, '2019-02-28', 104.17, '2026-06-14 18:01:53'),
(101, 3, '2019-03-31', 104.17, '2026-06-14 18:01:53'),
(102, 3, '2019-04-30', 104.17, '2026-06-14 18:01:53'),
(103, 3, '2019-05-31', 104.17, '2026-06-14 18:01:53'),
(104, 3, '2019-06-30', 104.17, '2026-06-14 18:01:53'),
(105, 3, '2019-07-31', 208.26, '2026-06-14 18:01:53'),
(106, 4, '2017-09-30', 83.33, '2026-06-14 18:02:50'),
(107, 4, '2017-10-31', 83.33, '2026-06-14 18:02:50'),
(108, 4, '2017-11-30', 83.33, '2026-06-14 18:02:50'),
(109, 4, '2017-12-31', 83.33, '2026-06-14 18:02:50'),
(110, 4, '2018-01-31', 83.33, '2026-06-14 18:02:50'),
(111, 4, '2018-02-28', 83.33, '2026-06-14 18:02:50'),
(112, 4, '2018-03-31', 83.33, '2026-06-14 18:02:50'),
(113, 4, '2018-04-30', 83.33, '2026-06-14 18:02:50'),
(114, 4, '2018-05-31', 83.33, '2026-06-14 18:02:50'),
(115, 4, '2018-06-30', 83.33, '2026-06-14 18:02:50'),
(116, 4, '2018-07-31', 83.33, '2026-06-14 18:02:50'),
(117, 4, '2018-08-31', 83.33, '2026-06-14 18:02:50'),
(118, 4, '2018-09-30', 83.33, '2026-06-14 18:02:50'),
(119, 4, '2018-10-31', 83.33, '2026-06-14 18:02:50'),
(120, 4, '2018-11-30', 83.33, '2026-06-14 18:02:50'),
(121, 4, '2018-12-31', 83.33, '2026-06-14 18:02:50'),
(122, 4, '2019-01-31', 83.33, '2026-06-14 18:02:50'),
(123, 4, '2019-02-28', 83.33, '2026-06-14 18:02:50'),
(124, 4, '2019-03-31', 83.33, '2026-06-14 18:02:50'),
(125, 4, '2019-04-30', 83.33, '2026-06-14 18:02:50'),
(126, 4, '2019-05-31', 83.33, '2026-06-14 18:02:50'),
(127, 4, '2019-06-30', 83.33, '2026-06-14 18:02:50'),
(128, 4, '2019-07-31', 83.33, '2026-06-14 18:02:50'),
(129, 4, '2019-08-31', 83.33, '2026-06-14 18:02:50'),
(130, 4, '2019-09-30', 83.33, '2026-06-14 18:02:50'),
(131, 4, '2019-10-31', 83.33, '2026-06-14 18:02:50'),
(132, 4, '2019-11-30', 83.33, '2026-06-14 18:02:50'),
(133, 4, '2019-12-31', 83.33, '2026-06-14 18:02:50'),
(134, 4, '2020-01-31', 83.33, '2026-06-14 18:02:50'),
(135, 4, '2020-02-29', 83.33, '2026-06-14 18:02:50'),
(136, 4, '2020-03-31', 83.33, '2026-06-14 18:02:50'),
(137, 4, '2020-04-30', 83.33, '2026-06-14 18:02:50'),
(138, 4, '2020-05-31', 83.33, '2026-06-14 18:02:50'),
(139, 4, '2020-06-30', 83.33, '2026-06-14 18:02:50'),
(140, 4, '2020-07-31', 166.78, '2026-06-14 18:02:50'),
(141, 6, '2026-02-28', 312.50, '2026-06-14 18:07:33'),
(142, 6, '2026-03-31', 312.50, '2026-06-14 18:07:33'),
(143, 6, '2026-04-30', 312.50, '2026-06-14 18:07:33'),
(144, 6, '2026-05-31', 312.50, '2026-06-14 18:07:33'),
(145, 7, '2026-02-28', 166.67, '2026-06-14 18:50:27'),
(146, 7, '2026-03-31', 166.67, '2026-06-14 18:50:27'),
(147, 7, '2026-04-30', 166.67, '2026-06-14 18:50:27'),
(148, 7, '2026-05-31', 166.67, '2026-06-14 18:50:27'),
(149, 8, '2026-02-28', 166.67, '2026-06-15 11:36:13'),
(150, 8, '2026-03-31', 166.67, '2026-06-15 11:36:13'),
(151, 8, '2026-04-30', 166.67, '2026-06-15 11:36:13'),
(152, 8, '2026-05-31', 166.67, '2026-06-15 11:36:13');

--
-- Declanșatori `amortizari`
--
DELIMITER $$
CREATE TRIGGER `nc_dupa_inserare_amortizare` AFTER INSERT ON `amortizari` FOR EACH ROW BEGIN
    DECLARE v_data_nc DATE;
    SET v_data_nc = LAST_DAY(NEW.luna_an);

    UPDATE MIJLOACE_FIXE SET valoare_actuala = valoare_actuala - NEW.valoare_amortizare WHERE id = NEW.id_mijloc_fix;
    
    SET @nc_id = GetOrCreateCurrentNC(v_data_nc);
    
    SELECT cont_contabil, nr_inventar INTO @cont_mf, @nr_inv FROM MIJLOACE_FIXE WHERE id = NEW.id_mijloc_fix;
    SET @cont_amort = IF(@cont_mf = '214', '2814', '2813');
    
    INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
    VALUES (@nc_id, '6811', @cont_amort, NEW.valoare_amortizare, NEW.valoare_amortizare, CONCAT('Amortizare mijloc fix cu nr. inventar: ', @nr_inv));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `facturi`
--

CREATE TABLE `facturi` (
  `id` int(11) NOT NULL,
  `id_partener` int(11) NOT NULL,
  `id_utilizator` int(11) DEFAULT NULL,
  `numar` int(11) NOT NULL,
  `tip` enum('emisă','primită') NOT NULL,
  `tip_produse` enum('marfă','mijloc fix','servicii','obiecte inventar') NOT NULL DEFAULT 'marfă',
  `data_emitere` date NOT NULL,
  `data_scadenta` date NOT NULL,
  `total_brut` decimal(10,2) NOT NULL DEFAULT 0.00,
  `suma_tva` decimal(10,2) DEFAULT 0.00,
  `total_net` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('emisă','încasată','primită','plătită') NOT NULL
) ;

--
-- Eliminarea datelor din tabel `facturi`
--

INSERT INTO `facturi` (`id`, `id_partener`, `id_utilizator`, `numar`, `tip`, `tip_produse`, `data_emitere`, `data_scadenta`, `total_brut`, `suma_tva`, `total_net`, `status`) VALUES
(1, 1, 1, 1, 'primită', 'mijloc fix', '2017-08-14', '2018-08-14', 134915.00, 23415.00, 111500.00, 'plătită'),
(2, 1, 2, 2, 'primită', 'mijloc fix', '2026-01-14', '2027-01-14', 82885.00, 14385.00, 68500.00, 'plătită'),
(3, 1, 1, 3, 'primită', 'obiecte inventar', '2024-08-14', '2025-07-14', 2199.00, 299.00, 1900.00, 'plătită'),
(4, 1, 3, 4, 'primită', 'obiecte inventar', '2026-01-14', '2026-07-14', 2047.00, 347.00, 1700.00, 'plătită'),
(5, 3, 3, 5, 'primită', 'marfă', '2026-06-14', '2026-07-14', 23111.00, 4011.00, 19100.00, 'primită'),
(7, 3, 3, 6, 'primită', 'marfă', '2026-06-14', '2026-07-14', 21780.00, 3780.00, 18000.00, 'primită'),
(8, 3, 3, 7, 'primită', 'marfă', '2026-06-14', '2026-07-14', 4356.00, 756.00, 3600.00, 'primită'),
(9, 2, 3, 8, 'primită', 'marfă', '2026-06-14', '2026-07-14', 1210.00, 210.00, 1000.00, 'plătită'),
(10, 1, 3, 9, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 1282.60, 222.60, 1060.00, 'încasată'),
(12, 1, 3, 10, 'emisă', 'marfă', '2026-06-14', '2026-08-14', 4235.00, 735.00, 3500.00, 'încasată'),
(13, 2, 3, 11, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 3630.00, 630.00, 3000.00, 'încasată'),
(14, 4, 3, 12, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 968.00, 168.00, 800.00, 'încasată'),
(15, 4, 3, 14, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 4876.30, 846.30, 4030.00, 'încasată'),
(16, 2, 3, 15, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 6776.00, 1176.00, 5600.00, 'încasată'),
(17, 2, 3, 16, 'emisă', 'marfă', '2026-06-14', '2026-08-14', 36.30, 6.30, 30.00, 'încasată'),
(18, 1, 3, 17, 'emisă', 'marfă', '2026-06-14', '2026-07-14', 12.10, 2.10, 10.00, 'încasată'),
(19, 4, 1, 18, 'emisă', 'marfă', '2026-06-14', '2026-07-16', 12.10, 2.10, 10.00, 'emisă'),
(20, 1, 2, 19, 'primită', 'marfă', '2026-06-14', '2026-07-29', 13128.50, 2278.50, 10850.00, 'primită'),
(21, 3, 2, 20, 'primită', 'servicii', '2026-03-11', '2026-06-11', 2178.00, 378.00, 1800.00, 'primită'),
(23, 1, 2, 21, 'primită', 'marfă', '2026-06-15', '2026-07-15', 968.00, 168.00, 800.00, 'plătită'),
(26, 1, 2, 22, 'primită', 'obiecte inventar', '2026-06-15', '2026-07-15', 1210.00, 210.00, 1000.00, 'plătită'),
(27, 1, 2, 23, 'primită', 'servicii', '2026-06-15', '2026-07-15', 60.50, 10.50, 50.00, 'plătită'),
(29, 1, 2, 24, 'primită', 'mijloc fix', '2026-06-15', '2026-07-15', 7260.00, 1260.00, 6000.00, 'primită'),
(32, 1, 2, 25, 'primită', 'marfă', '2026-06-16', '2026-07-16', 2783.00, 483.00, 2300.00, 'primită'),
(33, 1, 2, 26, 'emisă', 'marfă', '2026-06-16', '2026-07-16', 18.15, 3.15, 15.00, 'emisă');

--
-- Declanșatori `facturi`
--
DELIMITER $$
CREATE TRIGGER `actualizari_parteneri_dupa_update_factura` AFTER UPDATE ON `facturi` FOR EACH ROW BEGIN
    IF OLD.total_brut <> NEW.total_brut THEN
        IF NEW.tip = 'emisă' THEN
            UPDATE PARTENERI SET suma_creante = suma_creante + (NEW.total_brut - OLD.total_brut) WHERE id = NEW.id_partener;
        ELSE
            UPDATE PARTENERI SET suma_datorii = suma_datorii + (NEW.total_brut - OLD.total_brut) WHERE id = NEW.id_partener;
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `firme`
--

CREATE TABLE `firme` (
  `id` int(11) NOT NULL,
  `nume` varchar(150) NOT NULL,
  `cui` varchar(12) NOT NULL,
  `nr_reg_comert` varchar(15) NOT NULL,
  `an_infiintare` int(11) DEFAULT NULL,
  `adresa` varchar(300) NOT NULL,
  `iban` char(24) NOT NULL,
  `banca` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `telefon` char(10) NOT NULL
) ;

--
-- Eliminarea datelor din tabel `firme`
--

INSERT INTO `firme` (`id`, `nume`, `cui`, `nr_reg_comert`, `an_infiintare`, `adresa`, `iban`, `banca`, `email`, `telefon`) VALUES
(1, 'SC Cristina SRL', 'RO12345678', 'J2017123456050', 2017, 'Oradea, str. Nufărului, nr. 17', 'RO00INGB0000111122223333', 'ING Bank', 'contact@cristina.com', '0745000000');

--
-- Declanșatori `firme`
--
DELIMITER $$
CREATE TRIGGER `derive_firma_data` BEFORE INSERT ON `firme` FOR EACH ROW BEGIN
    -- calcul an infiintare
    IF NEW.nr_reg_comert LIKE '%/%' THEN
        SET NEW.an_infiintare = CAST(RIGHT(NEW.nr_reg_comert, 4) AS UNSIGNED);
    ELSE
        SET NEW.an_infiintare = CAST(SUBSTRING(NEW.nr_reg_comert, 2, 4) AS UNSIGNED);
    END IF;
    -- calcul banca din iban
    SET NEW.banca = CASE UPPER(SUBSTRING(NEW.iban, 5, 4))
        WHEN 'INGB' THEN 'ING Bank'
        WHEN 'RNCB' THEN 'BCR'
        WHEN 'BRDE' THEN 'BRD'
        WHEN 'BTRL' THEN 'Banca Transilvania'
        WHEN 'REVO' THEN 'Revolut'
        WHEN 'RZBR' THEN 'Raiffeisen Bank'
        WHEN 'UGBI' THEN 'Garanti Bank'
        WHEN 'TREZ' THEN 'Trezoreria Statului'
        WHEN 'CECE' THEN 'CEC Bank'
        ELSE CONCAT('Banca (BIC: ', SUBSTRING(NEW.iban, 5, 4), ')')
    END;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `limit_one_firma` BEFORE INSERT ON `firme` FOR EACH ROW BEGIN
    IF (SELECT COUNT(*) FROM FIRME) >= 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Eroare: Se poate adăuga o singură firmă în sistem!';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `istoric_preturi_vanzare`
--

CREATE TABLE `istoric_preturi_vanzare` (
  `id` int(11) NOT NULL,
  `id_marfa` int(11) NOT NULL,
  `pret_unitar_vanzare` decimal(10,2) NOT NULL,
  `data_start` date NOT NULL,
  `data_sfarsit` date DEFAULT NULL
) ;

--
-- Eliminarea datelor din tabel `istoric_preturi_vanzare`
--

INSERT INTO `istoric_preturi_vanzare` (`id`, `id_marfa`, `pret_unitar_vanzare`, `data_start`, `data_sfarsit`) VALUES
(1, 1, 50.00, '2026-06-14', '2026-06-14'),
(2, 2, 10.00, '2026-06-14', NULL),
(3, 1, 700.00, '2026-06-14', '2026-06-14'),
(4, 1, 70.00, '2026-06-14', NULL),
(5, 3, 10.00, '2026-06-14', NULL),
(6, 4, 30.00, '2026-06-14', NULL),
(7, 5, 15.00, '2026-06-14', '2026-06-16'),
(8, 6, 40.00, '2026-06-14', NULL),
(9, 7, 10.00, '2026-06-14', NULL),
(10, 8, 7.00, '2026-06-14', NULL),
(11, 9, 5.00, '2026-06-14', NULL),
(12, 10, 50.00, '2026-06-14', NULL),
(13, 11, 2.00, '2026-06-14', NULL),
(14, 12, 60.00, '2026-06-14', NULL),
(15, 13, 12.00, '2026-06-15', NULL),
(16, 5, 25.00, '2026-06-16', NULL);

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `marfuri`
--

CREATE TABLE `marfuri` (
  `id` int(11) NOT NULL,
  `denumire` varchar(100) NOT NULL,
  `categorie` varchar(50) NOT NULL,
  `um` varchar(10) NOT NULL,
  `cota_tva` enum('0','11','21') NOT NULL DEFAULT '21',
  `stoc_curent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pret_curent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `cmp` decimal(15,4) DEFAULT 0.0000
) ;

--
-- Eliminarea datelor din tabel `marfuri`
--

INSERT INTO `marfuri` (`id`, `denumire`, `categorie`, `um`, `cota_tva`, `stoc_curent`, `pret_curent`, `cmp`) VALUES
(1, 'Carte de colorat', 'Cărți/Reviste', 'buc', '21', 520.00, 70.00, 54.4776),
(2, 'Caiet A4', 'Caiete/Agende', 'buc', '21', 119.00, 10.00, 4.3193),
(3, 'Pix cu gel', 'Instrumente de scris', 'buc', '21', 100.00, 10.00, 5.0000),
(4, 'Stilou', 'Instrumente de scris', 'buc', '21', 109.00, 30.00, 15.4128),
(5, 'Creioane colorate', 'Instrumente de scris', 'set', '21', 99.00, 25.00, 23.0000),
(6, 'Agendă', 'Caiete/Agende', 'buc', '21', 100.00, 40.00, 25.0000),
(7, 'Marker permanent', 'Instrumente de scris', 'buc', '21', 100.00, 10.00, 9.0000),
(8, 'Caiet A5', 'Caiete/Agende', 'buc', '21', 100.00, 7.00, 5.0000),
(9, 'Creion grafic', 'Instrumente de scris', 'buc', '21', 100.00, 5.00, 3.0000),
(10, 'Pixuri colorate', 'Instrumente de scris', 'set', '21', 100.00, 50.00, 12.0000),
(11, 'Dosar', 'Papetărie', 'buc', '21', 100.00, 2.00, 0.5000),
(12, 'Hârtie cartonată', 'Papetărie', 'cutie', '21', 100.00, 60.00, 30.0000),
(13, 'Marker evidențiator', 'Instrumente de scris', 'buc', '21', 100.00, 12.00, 8.0000);

--
-- Declanșatori `marfuri`
--
DELIMITER $$
CREATE TRIGGER `actualizare_istoric_pret_dupa_actualizare_marfa` AFTER UPDATE ON `marfuri` FOR EACH ROW BEGIN
    IF OLD.pret_curent <> NEW.pret_curent THEN
        UPDATE ISTORIC_PRETURI_VANZARE SET data_sfarsit = CURDATE() WHERE id_marfa = NEW.id AND data_sfarsit IS NULL;
        INSERT INTO ISTORIC_PRETURI_VANZARE (id_marfa, pret_unitar_vanzare, data_start, data_sfarsit) 
        VALUES (NEW.id, NEW.pret_curent, CURDATE(), NULL);
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `inregistrare_istoric_pret_dupa_inserare_marfa` AFTER INSERT ON `marfuri` FOR EACH ROW BEGIN
    INSERT INTO ISTORIC_PRETURI_VANZARE (id_marfa, pret_unitar_vanzare, data_start, data_sfarsit)
    VALUES (NEW.id, NEW.pret_curent, CURDATE(), NULL);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `mijloace_fixe`
--

CREATE TABLE `mijloace_fixe` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) DEFAULT NULL,
  `denumire` varchar(150) NOT NULL,
  `nr_inventar` varchar(50) NOT NULL,
  `status` enum('activ','casat') NOT NULL DEFAULT 'activ',
  `data_intrare` date NOT NULL,
  `data_sfarsit` date NOT NULL,
  `data_casare` date DEFAULT NULL,
  `tip_amortizare` enum('liniară','accelerată') NOT NULL DEFAULT 'liniară',
  `cont_contabil` enum('2131','2132','2133','214') NOT NULL,
  `valoare_intrare` decimal(10,2) NOT NULL,
  `cota_tva` enum('0','11','21') NOT NULL DEFAULT '21',
  `val_amort_acc` decimal(10,2) DEFAULT 0.00,
  `valoare_actuala` decimal(10,2) NOT NULL DEFAULT 0.00,
  `durata_viata_luni` int(11) GENERATED ALWAYS AS (timestampdiff(MONTH,`data_intrare`,`data_sfarsit`)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `mijloace_fixe`
--

INSERT INTO `mijloace_fixe` (`id`, `id_factura`, `denumire`, `nr_inventar`, `status`, `data_intrare`, `data_sfarsit`, `data_casare`, `tip_amortizare`, `cont_contabil`, `valoare_intrare`, `cota_tva`, `val_amort_acc`, `valoare_actuala`) VALUES
(1, 1, 'Mașină', '111111', 'activ', '2017-08-13', '2022-08-13', NULL, 'accelerată', '2133', 100000.00, '21', 50000.00, 0.00),
(2, 1, 'Sistem de supraveghere', '222222', 'activ', '2017-08-13', '2019-08-13', NULL, 'liniară', '214', 6000.00, '21', 0.00, 0.00),
(3, 1, 'Cântar', '333333', 'activ', '2017-08-13', '2019-08-13', NULL, 'liniară', '2132', 2500.00, '21', 0.00, 0.00),
(4, 1, 'Telefon mobil', '444444', 'casat', '2017-08-13', '2020-08-13', '2026-06-14', 'liniară', '214', 3000.00, '21', 0.00, 0.00),
(6, 2, 'Sistem ventilație', '555555', 'activ', '2026-01-13', '2028-01-13', NULL, 'liniară', '214', 7500.00, '21', 0.00, 6250.00),
(7, 2, 'Mobilier', '666666', 'casat', '2026-01-13', '2029-01-13', '2026-06-14', 'liniară', '214', 6000.00, '21', 0.00, 5333.32),
(8, 2, 'Televizor', '777777', 'activ', '2026-01-13', '2028-01-13', NULL, 'accelerată', '214', 5000.00, '21', 2000.00, 4333.32),
(9, 29, 'Remorcă', '888888', 'activ', '2026-06-15', '2030-06-15', NULL, 'liniară', '2133', 6000.00, '21', 0.00, 6000.00);

--
-- Declanșatori `mijloace_fixe`
--
DELIMITER $$
CREATE TRIGGER `nc_dupa_casare_mijloc_fix` AFTER UPDATE ON `mijloace_fixe` FOR EACH ROW BEGIN
    IF OLD.status <> 'casat' AND NEW.status = 'casat' THEN
        SET @nc_id = GetOrCreateCurrentNC(CURDATE());
        SET @cont_amort = IF(NEW.cont_contabil = '214', '2814', '2813');
        IF NEW.valoare_actuala = 0 THEN
            INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
            VALUES (@nc_id, @cont_amort, NEW.cont_contabil, NEW.valoare_intrare, NEW.valoare_intrare, CONCAT('Casare MF nr. ', NEW.nr_inventar, ' - total amortizat'));
        ELSE
            INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, debit2, credit1, suma_debit1, suma_debit2, suma_credit1, explicatii)
            VALUES (@nc_id, @cont_amort, '6583', NEW.cont_contabil, (NEW.valoare_intrare - NEW.valoare_actuala), NEW.valoare_actuala, NEW.valoare_intrare, CONCAT('Casare MF nr. ', NEW.nr_inventar, ' - parțial amortizat'));
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `validare_mijloc_fix_inainte_de_inserare` BEFORE INSERT ON `mijloace_fixe` FOR EACH ROW BEGIN
    IF NEW.data_intrare < '2026-01-01' THEN 
        IF NEW.valoare_intrare < 2500 THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoare minima: 2500 RON.'; 
        END IF;
    ELSE 
        IF NEW.valoare_intrare < 5000 THEN 
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoare minima: 5000 RON.'; 
        END IF;
    END IF;

    -- validare val_amort_acc doar daca amortizarea e accelerata
    IF NEW.tip_amortizare = 'accelerată' THEN
        IF NEW.val_amort_acc <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoarea amortizarii accelerate trebuie sa fie pozitiva.';
        END IF;
        IF NEW.val_amort_acc > NEW.valoare_intrare / 2 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoarea amortizarii accelerate nu poate depasi 50% din valoarea de intrare.';
        END IF;
    END IF;

    SET NEW.valoare_actuala = NEW.valoare_intrare;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `mijloace_fixe_factura`
--

CREATE TABLE `mijloace_fixe_factura` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) NOT NULL,
  `id_mijloc_fix` int(11) DEFAULT NULL,
  `denumire` varchar(100) NOT NULL,
  `total_net` decimal(10,2) NOT NULL,
  `cota_tva` enum('0','11','21') NOT NULL DEFAULT '21',
  `suma_tva` decimal(10,2) GENERATED ALWAYS AS (`total_net` * (cast(cast(`cota_tva` as char charset utf8mb4) as unsigned) / 100)) STORED,
  `total_brut` decimal(10,2) GENERATED ALWAYS AS (`total_net` + `total_net` * (cast(cast(`cota_tva` as char charset utf8mb4) as unsigned) / 100)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `mijloace_fixe_factura`
--

INSERT INTO `mijloace_fixe_factura` (`id`, `id_factura`, `id_mijloc_fix`, `denumire`, `total_net`, `cota_tva`) VALUES
(1, 1, 1, 'Mașină', 100000.00, '21'),
(2, 1, 2, 'Sistem de supraveghere', 6000.00, '21'),
(3, 1, 3, 'Cântar', 2500.00, '21'),
(4, 1, 4, 'Telefon mobil', 3000.00, '21'),
(5, 2, 7, 'Mobilier', 6000.00, '21'),
(6, 2, NULL, 'Camion', 50000.00, '21'),
(7, 2, 8, 'Televizor', 5000.00, '21'),
(8, 2, 6, 'Sistem ventilație', 7500.00, '21'),
(9, 29, 9, 'Remorcă', 6000.00, '21');

--
-- Declanșatori `mijloace_fixe_factura`
--
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inregistrare_mf` AFTER UPDATE ON `mijloace_fixe_factura` FOR EACH ROW BEGIN
    DECLARE v_id_p INT;
    DECLARE v_data_f DATE;
    DECLARE v_cont VARCHAR(20);
    DECLARE v_nr_inv VARCHAR(50);
    DECLARE v_exista INT DEFAULT 0;

    -- generare operatie contabila doar dupa ce a fost inregistrat in bd
    IF OLD.id_mijloc_fix IS NULL AND NEW.id_mijloc_fix IS NOT NULL THEN
        SELECT cont_contabil, nr_inventar INTO v_cont, v_nr_inv FROM MIJLOACE_FIXE WHERE id = NEW.id_mijloc_fix;
        SELECT id_partener, data_emitere INTO v_id_p, v_data_f FROM FACTURI WHERE id = NEW.id_factura;

        SET @nc_id = GetOrCreateCurrentNC(v_data_f);

        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, debit2, credit1, suma_debit1, suma_debit2, suma_credit1, explicatii)
        VALUES (@nc_id, v_cont,  '4426', CONCAT('404.', v_id_p), NEW.total_net, NEW.suma_tva, NEW.total_brut, CONCAT('Achiziție mijloc fix nr. inventar: ', v_nr_inv));
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inserare_mf_factura` AFTER INSERT ON `mijloace_fixe_factura` FOR EACH ROW BEGIN
    CALL calcul_total_factura(NEW.id_factura);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `note_contabile`
--

CREATE TABLE `note_contabile` (
  `id` int(11) NOT NULL,
  `numar` varchar(20) NOT NULL,
  `data_intocmire` date NOT NULL,
  `status` enum('deschisă','finalizată') DEFAULT 'deschisă'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `note_contabile`
--

INSERT INTO `note_contabile` (`id`, `numar`, `data_intocmire`, `status`) VALUES
(1, 'NC1408171', '2017-08-14', 'finalizată'),
(2, 'NC3009171', '2017-09-30', 'finalizată'),
(3, 'NC3110171', '2017-10-31', 'finalizată'),
(4, 'NC3011171', '2017-11-30', 'finalizată'),
(5, 'NC3112171', '2017-12-31', 'finalizată'),
(6, 'NC3101181', '2018-01-31', 'finalizată'),
(7, 'NC2802181', '2018-02-28', 'finalizată'),
(8, 'NC3103181', '2018-03-31', 'finalizată'),
(9, 'NC3004181', '2018-04-30', 'finalizată'),
(10, 'NC3105181', '2018-05-31', 'finalizată'),
(11, 'NC3006181', '2018-06-30', 'finalizată'),
(12, 'NC3107181', '2018-07-31', 'finalizată'),
(13, 'NC3108181', '2018-08-31', 'finalizată'),
(14, 'NC3009181', '2018-09-30', 'finalizată'),
(15, 'NC3110181', '2018-10-31', 'finalizată'),
(16, 'NC3011181', '2018-11-30', 'finalizată'),
(17, 'NC3112181', '2018-12-31', 'finalizată'),
(18, 'NC3101191', '2019-01-31', 'finalizată'),
(19, 'NC2802191', '2019-02-28', 'finalizată'),
(20, 'NC3103191', '2019-03-31', 'finalizată'),
(21, 'NC3004191', '2019-04-30', 'finalizată'),
(22, 'NC3105191', '2019-05-31', 'finalizată'),
(23, 'NC3006191', '2019-06-30', 'finalizată'),
(24, 'NC3107191', '2019-07-31', 'finalizată'),
(25, 'NC3108191', '2019-08-31', 'finalizată'),
(26, 'NC3009191', '2019-09-30', 'finalizată'),
(27, 'NC3110191', '2019-10-31', 'finalizată'),
(28, 'NC3011191', '2019-11-30', 'finalizată'),
(29, 'NC3112191', '2019-12-31', 'finalizată'),
(30, 'NC3101201', '2020-01-31', 'finalizată'),
(31, 'NC2902201', '2020-02-29', 'finalizată'),
(32, 'NC3103201', '2020-03-31', 'finalizată'),
(33, 'NC3004201', '2020-04-30', 'finalizată'),
(34, 'NC3105201', '2020-05-31', 'finalizată'),
(35, 'NC3006201', '2020-06-30', 'finalizată'),
(36, 'NC3107201', '2020-07-31', 'finalizată'),
(37, 'NC3108201', '2020-08-31', 'finalizată'),
(38, 'NC3009201', '2020-09-30', 'finalizată'),
(39, 'NC3110201', '2020-10-31', 'finalizată'),
(40, 'NC3011201', '2020-11-30', 'finalizată'),
(41, 'NC3112201', '2020-12-31', 'finalizată'),
(42, 'NC3101211', '2021-01-31', 'finalizată'),
(43, 'NC2802211', '2021-02-28', 'finalizată'),
(44, 'NC3103211', '2021-03-31', 'finalizată'),
(45, 'NC3004211', '2021-04-30', 'finalizată'),
(46, 'NC3105211', '2021-05-31', 'finalizată'),
(47, 'NC3006211', '2021-06-30', 'finalizată'),
(48, 'NC3107211', '2021-07-31', 'finalizată'),
(49, 'NC3108211', '2021-08-31', 'finalizată'),
(50, 'NC3009211', '2021-09-30', 'finalizată'),
(51, 'NC3110211', '2021-10-31', 'finalizată'),
(52, 'NC3011211', '2021-11-30', 'finalizată'),
(53, 'NC3112211', '2021-12-31', 'finalizată'),
(54, 'NC3101221', '2022-01-31', 'finalizată'),
(55, 'NC2802221', '2022-02-28', 'finalizată'),
(56, 'NC3103221', '2022-03-31', 'finalizată'),
(57, 'NC3004221', '2022-04-30', 'finalizată'),
(58, 'NC3105221', '2022-05-31', 'finalizată'),
(59, 'NC3006221', '2022-06-30', 'finalizată'),
(60, 'NC3107221', '2022-07-31', 'finalizată'),
(61, 'NC1401261', '2026-01-14', 'finalizată'),
(62, 'NC2802261', '2026-02-28', 'finalizată'),
(63, 'NC3103261', '2026-03-31', 'finalizată'),
(64, 'NC3004261', '2026-04-30', 'finalizată'),
(65, 'NC3105261', '2026-05-31', 'finalizată'),
(66, 'NC1408241', '2024-08-14', 'finalizată'),
(67, 'NC1406261', '2026-06-14', 'finalizată'),
(68, 'NC1103261', '2026-03-11', 'finalizată'),
(69, 'NC1506261', '2026-06-15', 'finalizată'),
(70, 'NC1606261', '2026-06-16', 'deschisă');

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `obiecte_inventar`
--

CREATE TABLE `obiecte_inventar` (
  `id` int(11) NOT NULL,
  `denumire` varchar(100) NOT NULL,
  `um` varchar(10) NOT NULL,
  `cota_tva` enum('0','11','21') NOT NULL DEFAULT '21',
  `stoc_curent` decimal(10,2) NOT NULL DEFAULT 0.00
) ;

--
-- Eliminarea datelor din tabel `obiecte_inventar`
--

INSERT INTO `obiecte_inventar` (`id`, `denumire`, `um`, `cota_tva`, `stoc_curent`) VALUES
(1, 'Echipament protecție', 'set', '11', 0.00),
(2, 'Scaun birou', 'buc', '21', 0.00),
(3, 'Birou', 'buc', '21', 0.00),
(4, 'Dulap depozitare', 'buc', '21', 0.00),
(5, 'Telefon mobil', 'buc', '21', 0.00);

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `obiecte_inventar_factura`
--

CREATE TABLE `obiecte_inventar_factura` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) NOT NULL,
  `id_obiect_inventar` int(11) NOT NULL,
  `cantitate` decimal(10,2) NOT NULL DEFAULT 1.00,
  `total_net` decimal(10,2) NOT NULL,
  `suma_tva` decimal(10,2) DEFAULT 0.00,
  `total_brut` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `obiecte_inventar_factura`
--

INSERT INTO `obiecte_inventar_factura` (`id`, `id_factura`, `id_obiect_inventar`, `cantitate`, `total_net`, `suma_tva`, `total_brut`) VALUES
(1, 3, 1, 5.00, 1000.00, 110.00, 1110.00),
(2, 3, 2, 3.00, 900.00, 189.00, 1089.00),
(3, 4, 3, 1.00, 500.00, 105.00, 605.00),
(4, 4, 2, 1.00, 100.00, 21.00, 121.00),
(5, 4, 1, 1.00, 100.00, 11.00, 111.00),
(6, 4, 4, 2.00, 1000.00, 210.00, 1210.00),
(7, 26, 5, 1.00, 1000.00, 210.00, 1210.00);

--
-- Declanșatori `obiecte_inventar_factura`
--
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inserare_oi_factura` AFTER INSERT ON `obiecte_inventar_factura` FOR EACH ROW BEGIN
    DECLARE v_id_p INT;
    DECLARE v_data_f DATE;

    SELECT id_partener, data_emitere INTO v_id_p, v_data_f FROM FACTURI WHERE id = NEW.id_factura;
    SET @nc_id = GetOrCreateCurrentNC(v_data_f);

    -- achizitii
    INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, debit2, credit1, suma_debit1, suma_debit2, suma_credit1, explicatii)
    VALUES (@nc_id, '303', '4426', CONCAT('401.', v_id_p), NEW.total_net, NEW.suma_tva, NEW.total_brut, 'Achiziție obiecte de inventar');

    -- dare in folosinta
    INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
    VALUES (@nc_id, '603', '303', NEW.total_net, NEW.total_net, 'Dare în folosință obiecte inventar');
    
    CALL calcul_total_factura(NEW.id_factura);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `validare_inainte_inserare_oi_factura` BEFORE INSERT ON `obiecte_inventar_factura` FOR EACH ROW BEGIN
    DECLARE v_tip VARCHAR(20);

    SELECT tip INTO v_tip FROM FACTURI WHERE id = NEW.id_factura;

    IF v_tip = 'primită' THEN
        IF NEW.cantitate <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cantitatea trebuie să fie pozitivă.';
        END IF;
        IF NEW.total_net <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoarea netă trebuie să fie pozitivă.';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `operatii_nota_contabila`
--

CREATE TABLE `operatii_nota_contabila` (
  `id` int(11) NOT NULL,
  `id_nota_contabila` int(11) NOT NULL,
  `debit1` varchar(20) NOT NULL,
  `debit2` varchar(20) DEFAULT NULL,
  `credit1` varchar(20) NOT NULL,
  `credit2` varchar(20) DEFAULT NULL,
  `suma_debit1` decimal(10,2) NOT NULL,
  `suma_debit2` decimal(10,2) DEFAULT 0.00,
  `suma_credit1` decimal(10,2) NOT NULL,
  `suma_credit2` decimal(10,2) DEFAULT 0.00,
  `explicatii` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `operatii_nota_contabila`
--

INSERT INTO `operatii_nota_contabila` (`id`, `id_nota_contabila`, `debit1`, `debit2`, `credit1`, `credit2`, `suma_debit1`, `suma_debit2`, `suma_credit1`, `suma_credit2`, `explicatii`) VALUES
(1, 1, '2133', '4426', '404.1', NULL, 100000.00, 21000.00, 121000.00, 0.00, 'Achiziție mijloc fix nr. inventar: 111111'),
(2, 2, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(3, 3, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(4, 4, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(5, 5, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(6, 6, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(7, 7, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(8, 8, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(9, 9, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(10, 10, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(11, 11, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(12, 12, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(13, 13, '6811', NULL, '2813', NULL, 4166.67, 0.00, 4166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(14, 14, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(15, 15, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(16, 16, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(17, 17, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(18, 18, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(19, 19, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(20, 20, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(21, 21, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(22, 22, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(23, 23, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(24, 24, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(25, 25, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(26, 26, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(27, 27, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(28, 28, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(29, 29, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(30, 30, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(31, 31, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(32, 32, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(33, 33, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(34, 34, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(35, 35, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(36, 36, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(37, 37, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(38, 38, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(39, 39, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(40, 40, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(41, 41, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(42, 42, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(43, 43, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(44, 44, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(45, 45, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(46, 46, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(47, 47, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(48, 48, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(49, 49, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(50, 50, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(51, 51, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(52, 52, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(53, 53, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(54, 54, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(55, 55, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(56, 56, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(57, 57, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(58, 58, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(59, 59, '6811', NULL, '2813', NULL, 1041.67, 0.00, 1041.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(60, 60, '6811', NULL, '2813', NULL, 2083.14, 0.00, 2083.14, 0.00, 'Amortizare mijloc fix cu nr. inventar: 111111'),
(61, 1, '214', '4426', '404.1', NULL, 6000.00, 1260.00, 7260.00, 0.00, 'Achiziție mijloc fix nr. inventar: 222222'),
(62, 2, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(63, 3, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(64, 4, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(65, 5, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(66, 6, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(67, 7, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(68, 8, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(69, 9, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(70, 10, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(71, 11, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(72, 12, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(73, 13, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(74, 14, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(75, 15, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(76, 16, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(77, 17, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(78, 18, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(79, 19, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(80, 20, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(81, 21, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(82, 22, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(83, 23, '6811', NULL, '2814', NULL, 250.00, 0.00, 250.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(84, 24, '6811', NULL, '2814', NULL, 500.00, 0.00, 500.00, 0.00, 'Amortizare mijloc fix cu nr. inventar: 222222'),
(85, 1, '2132', '4426', '404.1', NULL, 2500.00, 525.00, 3025.00, 0.00, 'Achiziție mijloc fix nr. inventar: 333333'),
(86, 2, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(87, 3, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(88, 4, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(89, 5, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(90, 6, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(91, 7, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(92, 8, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(93, 9, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(94, 10, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(95, 11, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(96, 12, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(97, 13, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(98, 14, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(99, 15, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(100, 16, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(101, 17, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(102, 18, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(103, 19, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(104, 20, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(105, 21, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(106, 22, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(107, 23, '6811', NULL, '2813', NULL, 104.17, 0.00, 104.17, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(108, 24, '6811', NULL, '2813', NULL, 208.26, 0.00, 208.26, 0.00, 'Amortizare mijloc fix cu nr. inventar: 333333'),
(109, 1, '214', '4426', '404.1', NULL, 3000.00, 630.00, 3630.00, 0.00, 'Achiziție mijloc fix nr. inventar: 444444'),
(110, 2, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(111, 3, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(112, 4, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(113, 5, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(114, 6, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(115, 7, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(116, 8, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(117, 9, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(118, 10, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(119, 11, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(120, 12, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(121, 13, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(122, 14, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(123, 15, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(124, 16, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(125, 17, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(126, 18, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(127, 19, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(128, 20, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(129, 21, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(130, 22, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(131, 23, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(132, 24, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(133, 25, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(134, 26, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(135, 27, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(136, 28, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(137, 29, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(138, 30, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(139, 31, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(140, 32, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(141, 33, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(142, 34, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(143, 35, '6811', NULL, '2814', NULL, 83.33, 0.00, 83.33, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(144, 36, '6811', NULL, '2814', NULL, 166.78, 0.00, 166.78, 0.00, 'Amortizare mijloc fix cu nr. inventar: 444444'),
(145, 61, '214', '4426', '404.1', NULL, 7500.00, 1575.00, 9075.00, 0.00, 'Achiziție mijloc fix nr. inventar: 555555'),
(146, 62, '6811', NULL, '2814', NULL, 312.50, 0.00, 312.50, 0.00, 'Amortizare mijloc fix cu nr. inventar: 555555'),
(147, 63, '6811', NULL, '2814', NULL, 312.50, 0.00, 312.50, 0.00, 'Amortizare mijloc fix cu nr. inventar: 555555'),
(148, 64, '6811', NULL, '2814', NULL, 312.50, 0.00, 312.50, 0.00, 'Amortizare mijloc fix cu nr. inventar: 555555'),
(149, 65, '6811', NULL, '2814', NULL, 312.50, 0.00, 312.50, 0.00, 'Amortizare mijloc fix cu nr. inventar: 555555'),
(150, 66, '303', '4426', '401.1', NULL, 1000.00, 110.00, 1110.00, 0.00, 'Achiziție obiecte de inventar'),
(151, 66, '603', NULL, '303', NULL, 1000.00, 0.00, 1000.00, 0.00, 'Dare în folosință obiecte inventar'),
(152, 66, '303', '4426', '401.1', NULL, 900.00, 189.00, 1089.00, 0.00, 'Achiziție obiecte de inventar'),
(153, 66, '603', NULL, '303', NULL, 900.00, 0.00, 900.00, 0.00, 'Dare în folosință obiecte inventar'),
(154, 61, '303', '4426', '401.1', NULL, 500.00, 105.00, 605.00, 0.00, 'Achiziție obiecte de inventar'),
(155, 61, '603', NULL, '303', NULL, 500.00, 0.00, 500.00, 0.00, 'Dare în folosință obiecte inventar'),
(156, 61, '303', '4426', '401.1', NULL, 100.00, 21.00, 121.00, 0.00, 'Achiziție obiecte de inventar'),
(157, 61, '603', NULL, '303', NULL, 100.00, 0.00, 100.00, 0.00, 'Dare în folosință obiecte inventar'),
(158, 61, '303', '4426', '401.1', NULL, 100.00, 11.00, 111.00, 0.00, 'Achiziție obiecte de inventar'),
(159, 61, '603', NULL, '303', NULL, 100.00, 0.00, 100.00, 0.00, 'Dare în folosință obiecte inventar'),
(160, 61, '303', '4426', '401.1', NULL, 1000.00, 210.00, 1210.00, 0.00, 'Achiziție obiecte de inventar'),
(161, 61, '603', NULL, '303', NULL, 1000.00, 0.00, 1000.00, 0.00, 'Dare în folosință obiecte inventar'),
(162, 67, '371', '4426', '401.3', NULL, 18500.00, 3885.00, 22385.00, 0.00, 'Achiziție mărfuri'),
(163, 67, '371', '4426', '401.3', NULL, 600.00, 126.00, 726.00, 0.00, 'Achiziție mărfuri'),
(164, 67, '371', '4426', '401.3', NULL, 18000.00, 3780.00, 21780.00, 0.00, 'Achiziție mărfuri'),
(165, 67, '371', '4426', '401.3', NULL, 600.00, 126.00, 726.00, 0.00, 'Achiziție mărfuri'),
(166, 67, '371', '4426', '401.3', NULL, 3000.00, 630.00, 3630.00, 0.00, 'Achiziție mărfuri'),
(167, 67, '371', '4426', '401.2', NULL, 1000.00, 210.00, 1210.00, 0.00, 'Achiziție mărfuri'),
(168, 67, '4111.1', NULL, '707', '4427', 1197.90, 0.00, 990.00, 207.90, 'Vânzare mărfuri'),
(169, 67, '607', NULL, '371', NULL, 594.00, 0.00, 594.00, 0.00, 'Descărcare gestiune marfă'),
(170, 67, '4111.1', NULL, '707', '4427', 84.70, 0.00, 70.00, 14.70, 'Vânzare mărfuri'),
(171, 67, '607', NULL, '371', NULL, 54.48, 0.00, 54.48, 0.00, 'Descărcare gestiune marfă'),
(172, 67, '4111.1', NULL, '707', '4427', 4235.00, 0.00, 3500.00, 735.00, 'Vânzare mărfuri'),
(173, 67, '607', NULL, '371', NULL, 2723.88, 0.00, 2723.88, 0.00, 'Descărcare gestiune marfă'),
(174, 67, '4111.2', NULL, '707', '4427', 1815.00, 0.00, 1500.00, 315.00, 'Vânzare mărfuri'),
(175, 67, '607', NULL, '371', NULL, 1000.00, 0.00, 1000.00, 0.00, 'Descărcare gestiune marfă'),
(176, 67, '4111.2', NULL, '707', '4427', 1815.00, 0.00, 1500.00, 315.00, 'Vânzare mărfuri'),
(177, 67, '607', NULL, '371', NULL, 1000.00, 0.00, 1000.00, 0.00, 'Descărcare gestiune marfă'),
(178, 67, '4111.4', NULL, '707', '4427', 968.00, 0.00, 800.00, 168.00, 'Vânzare mărfuri'),
(179, 67, '607', NULL, '371', NULL, 480.00, 0.00, 480.00, 0.00, 'Descărcare gestiune marfă'),
(180, 67, '4111.4', NULL, '707', '4427', 3267.00, 0.00, 2700.00, 567.00, 'Vânzare mărfuri'),
(181, 67, '607', NULL, '371', NULL, 1800.00, 0.00, 1800.00, 0.00, 'Descărcare gestiune marfă'),
(182, 67, '4111.4', NULL, '707', '4427', 1609.30, 0.00, 1330.00, 279.30, 'Vânzare mărfuri'),
(183, 67, '607', NULL, '371', NULL, 1035.07, 0.00, 1035.07, 0.00, 'Descărcare gestiune marfă'),
(184, 67, '4111.2', NULL, '707', '4427', 6776.00, 0.00, 5600.00, 1176.00, 'Vânzare mărfuri'),
(185, 67, '607', NULL, '371', NULL, 4358.21, 0.00, 4358.21, 0.00, 'Descărcare gestiune marfă'),
(186, 67, '5311', NULL, '4111.1', NULL, 4235.00, 0.00, 4235.00, 0.00, 'Înregistrare încasare cash'),
(187, 67, '5311', NULL, '4111.2', NULL, 3630.00, 0.00, 3630.00, 0.00, 'Înregistrare încasare cash'),
(188, 67, '5311', NULL, '4111.4', NULL, 4876.30, 0.00, 4876.30, 0.00, 'Înregistrare încasare cash'),
(189, 67, '401.1', NULL, '5311', NULL, 2199.00, 0.00, 2199.00, 0.00, 'Înregistrare plată cash'),
(190, 67, '401.1', NULL, '5311', NULL, 2047.00, 0.00, 2047.00, 0.00, 'Înregistrare plată cash'),
(191, 67, '4111.2', NULL, '707', '4427', 36.30, 0.00, 30.00, 6.30, 'Vânzare mărfuri'),
(192, 67, '607', NULL, '371', NULL, 20.00, 0.00, 20.00, 0.00, 'Descărcare gestiune marfă'),
(193, 67, '5311', NULL, '4111.2', NULL, 36.30, 0.00, 36.30, 0.00, 'Înregistrare încasare cash'),
(194, 67, '404.1', NULL, '5121', NULL, 134915.00, 0.00, 134915.00, 0.00, 'Înregistrare plată card'),
(195, 67, '5121', NULL, '4111.1', NULL, 1282.60, 0.00, 1282.60, 0.00, 'Înregistrare încasare card'),
(196, 67, '404.1', NULL, '5121', NULL, 82885.00, 0.00, 82885.00, 0.00, 'Înregistrare plată card'),
(197, 67, '4111.1', NULL, '707', '4427', 12.10, 0.00, 10.00, 2.10, 'Vânzare mărfuri'),
(198, 67, '607', NULL, '371', NULL, 6.00, 0.00, 6.00, 0.00, 'Descărcare gestiune marfă'),
(199, 67, '5311', NULL, '4111.1', NULL, 12.10, 0.00, 12.10, 0.00, 'Înregistrare încasare cash'),
(200, 61, '214', '4426', '404.1', NULL, 6000.00, 1260.00, 7260.00, 0.00, 'Achiziție mijloc fix nr. inventar: 666666'),
(201, 62, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 666666'),
(202, 63, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 666666'),
(203, 64, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 666666'),
(204, 65, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 666666'),
(205, 67, '2814', '6583', '214', NULL, 666.68, 5333.32, 6000.00, 0.00, 'Casare MF nr. 666666 - parțial amortizat'),
(206, 67, '2814', NULL, '214', NULL, 3000.00, 0.00, 3000.00, 0.00, 'Casare MF nr. 444444 - total amortizat'),
(207, 67, '4111.4', NULL, '707', '4427', 12.10, 0.00, 10.00, 2.10, 'Vânzare mărfuri'),
(208, 67, '607', NULL, '371', NULL, 6.00, 0.00, 6.00, 0.00, 'Descărcare gestiune marfă'),
(209, 67, '371', '4426', '401.1', NULL, 400.00, 84.00, 484.00, 0.00, 'Achiziție mărfuri'),
(210, 67, '371', '4426', '401.1', NULL, 500.00, 105.00, 605.00, 0.00, 'Achiziție mărfuri'),
(211, 67, '371', '4426', '401.1', NULL, 1500.00, 315.00, 1815.00, 0.00, 'Achiziție mărfuri'),
(212, 67, '371', '4426', '401.1', NULL, 2500.00, 525.00, 3025.00, 0.00, 'Achiziție mărfuri'),
(213, 67, '371', '4426', '401.1', NULL, 900.00, 189.00, 1089.00, 0.00, 'Achiziție mărfuri'),
(214, 67, '371', '4426', '401.1', NULL, 500.00, 105.00, 605.00, 0.00, 'Achiziție mărfuri'),
(215, 67, '371', '4426', '401.1', NULL, 300.00, 63.00, 363.00, 0.00, 'Achiziție mărfuri'),
(216, 67, '371', '4426', '401.1', NULL, 1200.00, 252.00, 1452.00, 0.00, 'Achiziție mărfuri'),
(217, 67, '371', '4426', '401.1', NULL, 50.00, 10.50, 60.50, 0.00, 'Achiziție mărfuri'),
(218, 67, '371', '4426', '401.1', NULL, 3000.00, 630.00, 3630.00, 0.00, 'Achiziție mărfuri'),
(219, 68, '628', '4426', '401.3', NULL, 600.00, 126.00, 726.00, 0.00, 'Alte servicii'),
(220, 68, '612', '4426', '401.3', NULL, 1000.00, 210.00, 1210.00, 0.00, 'Chirii'),
(221, 68, '611', '4426', '401.3', NULL, 200.00, 42.00, 242.00, 0.00, 'Întreținere și reparații'),
(222, 67, '401.2', NULL, '5121', NULL, 1210.00, 0.00, 1210.00, 0.00, 'Înregistrare plată card'),
(223, 69, '371', '4426', '401.1', NULL, 800.00, 168.00, 968.00, 0.00, 'Achiziție mărfuri'),
(224, 69, '303', '4426', '401.1', NULL, 1000.00, 210.00, 1210.00, 0.00, 'Achiziție obiecte de inventar'),
(225, 69, '603', NULL, '303', NULL, 1000.00, 0.00, 1000.00, 0.00, 'Dare în folosință obiecte inventar'),
(226, 69, '626', '4426', '401.1', NULL, 50.00, 10.50, 60.50, 0.00, 'Cheltuieli telecomunicații'),
(227, 61, '214', '4426', '404.1', NULL, 5000.00, 1050.00, 6050.00, 0.00, 'Achiziție mijloc fix nr. inventar: 777777'),
(228, 62, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 777777'),
(229, 63, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 777777'),
(230, 64, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 777777'),
(231, 65, '6811', NULL, '2814', NULL, 166.67, 0.00, 166.67, 0.00, 'Amortizare mijloc fix cu nr. inventar: 777777'),
(232, 69, '2133', '4426', '404.1', NULL, 6000.00, 1260.00, 7260.00, 0.00, 'Achiziție mijloc fix nr. inventar: 888888'),
(233, 69, '401.1', NULL, '5311', NULL, 968.00, 0.00, 968.00, 0.00, 'Înregistrare plată cash'),
(234, 69, '5311', NULL, '4111.4', NULL, 968.00, 0.00, 968.00, 0.00, 'Înregistrare încasare cash'),
(235, 69, '401.1', NULL, '5311', NULL, 60.50, 0.00, 60.50, 0.00, 'Înregistrare plată cash'),
(236, 69, '401.1', NULL, '5121', NULL, 1210.00, 0.00, 1210.00, 0.00, 'Înregistrare plată card'),
(237, 69, '5121', NULL, '4111.2', NULL, 6776.00, 0.00, 6776.00, 0.00, 'Înregistrare încasare card'),
(238, 70, '371', '4426', '401.1', NULL, 2300.00, 483.00, 2783.00, 0.00, 'Achiziție mărfuri'),
(239, 70, '4111.1', NULL, '707', '4427', 18.15, 0.00, 15.00, 3.15, 'Vânzare mărfuri'),
(240, 70, '607', NULL, '371', NULL, 23.00, 0.00, 23.00, 0.00, 'Descărcare gestiune marfă');

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `parteneri`
--

CREATE TABLE `parteneri` (
  `id` int(11) NOT NULL,
  `nume` varchar(150) NOT NULL,
  `cui` varchar(12) NOT NULL,
  `nr_reg_comert` varchar(15) NOT NULL,
  `adresa` varchar(300) NOT NULL,
  `tip_partener` enum('client','furnizor','ambele') NOT NULL,
  `iban` char(24) NOT NULL,
  `banca` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `telefon` char(10) NOT NULL,
  `suma_creante` decimal(15,2) DEFAULT 0.00,
  `suma_datorii` decimal(15,2) DEFAULT 0.00
) ;

--
-- Eliminarea datelor din tabel `parteneri`
--

INSERT INTO `parteneri` (`id`, `nume`, `cui`, `nr_reg_comert`, `adresa`, `tip_partener`, `iban`, `banca`, `email`, `telefon`, `suma_creante`, `suma_datorii`) VALUES
(1, 'Firma 1 - furnizor + client', 'RO111111', 'J2016111111051', 'Oradea, Str. Dacia, nr. 1', 'ambele', 'RO11BRDE1111111111111111', 'BRD', 'contact@firma1.com', '0745111111', 18.15, 23171.50),
(2, 'Firma 2 - furnizor + client', 'RO222222', 'J2015222222052', 'Oradea, str. Decebal, nr. 2', 'ambele', 'RO22RZBR2222222222222222', 'Raiffeisen Bank', 'contact@firma2.com', '0745222222', 0.00, 0.00),
(3, 'Firma 3 - furnizor', 'RO333333', 'J2017333333123', 'Cluj Napoca, str. Unirii, nr. 3', 'furnizor', 'RO33RNCB3333333333333333', 'BCR', 'contact@firma3.com', '0745333333', 0.00, 51425.00),
(4, 'Firma 4 - client', 'RO444444', 'J2013444444054', 'Oradea, str. Oneștilor, nr. 4', 'client', 'RO44BTRL4444444444444444', 'Banca Transilvania', 'contact@firma4.com', '0145444444', 12.10, 0.00);

--
-- Declanșatori `parteneri`
--
DELIMITER $$
CREATE TRIGGER `derive_partener_banca` BEFORE INSERT ON `parteneri` FOR EACH ROW BEGIN
    SET NEW.banca = CASE UPPER(SUBSTRING(NEW.iban, 5, 4))
        WHEN 'INGB' THEN 'ING Bank'
        WHEN 'RNCB' THEN 'BCR'
        WHEN 'BRDE' THEN 'BRD'
        WHEN 'BTRL' THEN 'Banca Transilvania'
        WHEN 'REVO' THEN 'Revolut'
        WHEN 'RZBR' THEN 'Raiffeisen Bank'
        WHEN 'UGBI' THEN 'Garanti Bank'
        WHEN 'TREZ' THEN 'Trezoreria Statului'
        WHEN 'CECE' THEN 'CEC Bank'
        ELSE CONCAT('Banca (BIC: ', SUBSTRING(NEW.iban, 5, 4), ')')
    END;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `plati_incasari`
--

CREATE TABLE `plati_incasari` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) NOT NULL,
  `data` datetime DEFAULT current_timestamp(),
  `suma` decimal(10,2) DEFAULT 0.00,
  `tip` enum('plată','încasare') NOT NULL,
  `metoda_plata` enum('cash','card') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `plati_incasari`
--

INSERT INTO `plati_incasari` (`id`, `id_factura`, `data`, `suma`, `tip`, `metoda_plata`) VALUES
(1, 12, '2026-06-14 18:34:59', 4235.00, 'încasare', 'cash'),
(2, 13, '2026-06-14 18:35:06', 3630.00, 'încasare', 'cash'),
(3, 15, '2026-06-14 18:35:13', 4876.30, 'încasare', 'cash'),
(4, 3, '2026-06-14 18:36:19', 2199.00, 'plată', 'cash'),
(5, 4, '2026-06-14 18:36:34', 2047.00, 'plată', 'cash'),
(6, 17, '2026-06-14 18:38:11', 36.30, 'încasare', 'cash'),
(7, 1, '2026-06-14 18:38:47', 134915.00, 'plată', 'card'),
(8, 10, '2026-06-14 18:41:33', 1282.60, 'încasare', 'card'),
(9, 2, '2026-06-14 18:44:50', 82885.00, 'plată', 'card'),
(10, 18, '2026-06-14 18:47:33', 12.10, 'încasare', 'cash'),
(11, 9, '2026-06-14 19:20:43', 1210.00, 'plată', 'card'),
(12, 23, '2026-06-15 11:39:10', 968.00, 'plată', 'cash'),
(13, 14, '2026-06-15 12:53:43', 968.00, 'încasare', 'cash'),
(14, 27, '2026-06-15 12:54:13', 60.50, 'plată', 'cash'),
(15, 26, '2026-06-15 12:54:40', 1210.00, 'plată', 'card'),
(16, 16, '2026-06-15 12:55:15', 6776.00, 'încasare', 'card');

--
-- Declanșatori `plati_incasari`
--
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inserare_plata_incasare` AFTER INSERT ON `plati_incasari` FOR EACH ROW BEGIN
    DECLARE v_id_partener INT;
    DECLARE v_tip_f VARCHAR(20);
    DECLARE v_tip_prod VARCHAR(50);
    SELECT id_partener, tip, tip_produse INTO v_id_partener, v_tip_f, v_tip_prod FROM FACTURI WHERE id = NEW.id_factura;
    
    IF v_tip_f = 'emisă' THEN 
        UPDATE PARTENERI SET suma_creante = suma_creante - NEW.suma WHERE id = v_id_partener;
        UPDATE FACTURI SET status = 'încasată' WHERE id = NEW.id_factura;
    ELSE 
        UPDATE PARTENERI SET suma_datorii = suma_datorii - NEW.suma WHERE id = v_id_partener;
        UPDATE FACTURI SET status = 'plătită' WHERE id = NEW.id_factura;
    END IF;
    
    SET @nc_id = GetOrCreateCurrentNC(DATE(NEW.data));
    
    SET @cont_trez = IF(NEW.metoda_plata = 'cash', '5311', '5121');
    IF NEW.tip = 'plată' THEN
        SET @cont_p = IF(v_tip_prod = 'mijloc fix', CONCAT('404.', v_id_partener), CONCAT('401.', v_id_partener));
        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
        VALUES (@nc_id, @cont_p, @cont_trez, NEW.suma, NEW.suma, CONCAT('Înregistrare plată ', NEW.metoda_plata));
    ELSE
        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
        VALUES (@nc_id, @cont_trez, CONCAT('4111.', v_id_partener), NEW.suma, NEW.suma, CONCAT('Înregistrare încasare ', NEW.metoda_plata));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `produse_factura`
--

CREATE TABLE `produse_factura` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) NOT NULL,
  `id_marfa` int(11) NOT NULL,
  `cantitate` decimal(10,2) NOT NULL,
  `pret_unitar_cumparare` decimal(15,2) NOT NULL,
  `total_net` decimal(10,2) DEFAULT 0.00,
  `suma_tva` decimal(10,2) DEFAULT 0.00,
  `total_brut` decimal(10,2) DEFAULT 0.00
) ;

--
-- Eliminarea datelor din tabel `produse_factura`
--

INSERT INTO `produse_factura` (`id`, `id_factura`, `id_marfa`, `cantitate`, `pret_unitar_cumparare`, `total_net`, `suma_tva`, `total_brut`) VALUES
(1, 5, 1, 370.00, 50.00, 18500.00, 3885.00, 22385.00),
(2, 5, 2, 100.00, 6.00, 600.00, 126.00, 726.00),
(3, 7, 1, 300.00, 60.00, 18000.00, 3780.00, 21780.00),
(4, 8, 3, 100.00, 6.00, 600.00, 126.00, 726.00),
(5, 8, 4, 150.00, 20.00, 3000.00, 630.00, 3630.00),
(6, 9, 5, 100.00, 10.00, 1000.00, 210.00, 1210.00),
(7, 10, 3, 99.00, 0.00, 990.00, 207.90, 1197.90),
(8, 10, 1, 1.00, 0.00, 70.00, 14.70, 84.70),
(9, 12, 1, 50.00, 0.00, 3500.00, 735.00, 4235.00),
(10, 13, 5, 100.00, 0.00, 1500.00, 315.00, 1815.00),
(11, 13, 4, 50.00, 0.00, 1500.00, 315.00, 1815.00),
(12, 14, 2, 80.00, 0.00, 800.00, 168.00, 968.00),
(13, 15, 4, 90.00, 0.00, 2700.00, 567.00, 3267.00),
(14, 15, 1, 19.00, 0.00, 1330.00, 279.30, 1609.30),
(15, 16, 1, 80.00, 0.00, 5600.00, 1176.00, 6776.00),
(16, 17, 4, 1.00, 0.00, 30.00, 6.30, 36.30),
(17, 18, 3, 1.00, 0.00, 10.00, 2.10, 12.10),
(18, 19, 2, 1.00, 0.00, 10.00, 2.10, 12.10),
(19, 20, 2, 100.00, 4.00, 400.00, 84.00, 484.00),
(20, 20, 3, 100.00, 5.00, 500.00, 105.00, 605.00),
(21, 20, 4, 100.00, 15.00, 1500.00, 315.00, 1815.00),
(22, 20, 6, 100.00, 25.00, 2500.00, 525.00, 3025.00),
(23, 20, 7, 100.00, 9.00, 900.00, 189.00, 1089.00),
(24, 20, 8, 100.00, 5.00, 500.00, 105.00, 605.00),
(25, 20, 9, 100.00, 3.00, 300.00, 63.00, 363.00),
(26, 20, 10, 100.00, 12.00, 1200.00, 252.00, 1452.00),
(27, 20, 11, 100.00, 0.50, 50.00, 10.50, 60.50),
(28, 20, 12, 100.00, 30.00, 3000.00, 630.00, 3630.00),
(29, 23, 13, 100.00, 8.00, 800.00, 168.00, 968.00),
(30, 32, 5, 100.00, 23.00, 2300.00, 483.00, 2783.00),
(31, 33, 5, 1.00, 0.00, 15.00, 3.15, 18.15);

--
-- Declanșatori `produse_factura`
--
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inserare_marfa_factura` AFTER INSERT ON `produse_factura` FOR EACH ROW BEGIN
    DECLARE v_tip_f ENUM('emisă', 'primită');
    DECLARE v_id_p INT; 
    DECLARE v_data_f DATE;
    DECLARE v_pret_v, v_neta, v_tva, v_bruta, v_cost_desc DECIMAL(15,2);

    SELECT tip, id_partener, data_emitere INTO v_tip_f, v_id_p, v_data_f 
    FROM FACTURI WHERE id = NEW.id_factura;

    SET @nc_id = GetOrCreateCurrentNC(v_data_f);
    
    -- achizitie (pret cumparare)
    IF v_tip_f = 'primită' THEN 
        SET v_neta = NEW.total_net;
        SET v_tva  = NEW.suma_tva;
        SET v_bruta = NEW.total_brut;

        UPDATE MARFURI SET 
            cmp = (cmp * stoc_curent + v_neta) / (stoc_curent + NEW.cantitate),
            stoc_curent = stoc_curent + NEW.cantitate 
        WHERE id = NEW.id_marfa;

        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, debit2, credit1, suma_debit1, suma_debit2, suma_credit1, explicatii)
        VALUES (@nc_id, '371', '4426', CONCAT('401.', v_id_p), v_neta, v_tva, v_bruta, 'Achiziție mărfuri');

    -- vanzare (pret vanzare)
    ELSEIF v_tip_f = 'emisă' THEN
        UPDATE MARFURI SET stoc_curent = stoc_curent - NEW.cantitate WHERE id = NEW.id_marfa;
            
        SELECT pret_unitar_vanzare INTO v_pret_v FROM ISTORIC_PRETURI_VANZARE 
        WHERE id_marfa = NEW.id_marfa AND data_start <= v_data_f ORDER BY data_start DESC LIMIT 1;

        SET v_neta  = v_pret_v * NEW.cantitate;
        SET v_tva   = v_neta * (NEW.suma_tva / NULLIF(NEW.total_net, 0));
        SET v_bruta = v_neta + v_tva;

        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, credit2, suma_debit1, suma_credit1, suma_credit2, explicatii)
        VALUES (@nc_id, CONCAT('4111.', v_id_p), '707', '4427', v_bruta, v_neta, v_tva, 'Vânzare mărfuri');

        -- descarcare gestiune (cmp)
        SELECT (NEW.cantitate * cmp) INTO v_cost_desc FROM MARFURI WHERE id = NEW.id_marfa;
        INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, credit1, suma_debit1, suma_credit1, explicatii)
        VALUES (@nc_id, '607', '371', v_cost_desc, v_cost_desc, 'Descărcare gestiune marfă');
    END IF;

    CALL calcul_total_factura(NEW.id_factura);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `validare_inainte_inserare_marfa_factura` BEFORE INSERT ON `produse_factura` FOR EACH ROW BEGIN
    DECLARE v_tip VARCHAR(20);
    DECLARE v_stoc DECIMAL(10,2);

    SELECT tip INTO v_tip FROM FACTURI WHERE id = NEW.id_factura;

    -- validare cantitate pentru ambele tipuri de facturi
    IF NEW.cantitate <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cantitatea trebuie să fie pozitivă.';
    END IF;

    IF v_tip = 'emisă' THEN
        SELECT stoc_curent INTO v_stoc FROM MARFURI WHERE id = NEW.id_marfa;
        IF v_stoc < NEW.cantitate THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stoc insuficient pentru această operațiune.';
        END IF;
    END IF;

    IF v_tip = 'primită' THEN
        IF NEW.pret_unitar_cumparare <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Prețul de cumpărare trebuie să fie pozitiv.';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `servicii_factura`
--

CREATE TABLE `servicii_factura` (
  `id` int(11) NOT NULL,
  `id_factura` int(11) NOT NULL,
  `denumire` varchar(255) NOT NULL,
  `total_net` decimal(10,2) NOT NULL,
  `cota_tva` enum('0','11','21') NOT NULL DEFAULT '21',
  `suma_tva` decimal(10,2) GENERATED ALWAYS AS (`total_net` * (cast(cast(`cota_tva` as char charset utf8mb4) as unsigned) / 100)) STORED,
  `total_brut` decimal(10,2) GENERATED ALWAYS AS (`total_net` + `total_net` * (cast(cast(`cota_tva` as char charset utf8mb4) as unsigned) / 100)) STORED,
  `cont_contabil` enum('605','626','611','612','628') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Eliminarea datelor din tabel `servicii_factura`
--

INSERT INTO `servicii_factura` (`id`, `id_factura`, `denumire`, `total_net`, `cota_tva`, `cont_contabil`) VALUES
(1, 21, 'Curățenie', 600.00, '21', '628'),
(2, 21, 'Chirie utilaj', 1000.00, '21', '612'),
(3, 21, 'Reparații utilaj', 200.00, '21', '611'),
(4, 27, 'Internet', 50.00, '21', '626');

--
-- Declanșatori `servicii_factura`
--
DELIMITER $$
CREATE TRIGGER `actualizari_dupa_inserare_serviciu_factura` AFTER INSERT ON `servicii_factura` FOR EACH ROW BEGIN
    DECLARE v_id_p INT;
    DECLARE v_data_f DATE; 
    DECLARE v_expl VARCHAR(255);
    DECLARE v_cont_str VARCHAR(20);
    
    SELECT id_partener, data_emitere INTO v_id_p, v_data_f FROM FACTURI WHERE id = NEW.id_factura;
    
    SET v_cont_str = TRIM(CAST(NEW.cont_contabil AS CHAR));

    SET v_expl = CASE v_cont_str
        WHEN '605' THEN 'Cheltuieli cu energia și apa' 
        WHEN '626' THEN 'Cheltuieli telecomunicații'
        WHEN '611' THEN 'Întreținere și reparații' 
        WHEN '612' THEN 'Chirii'
        WHEN '628' THEN 'Alte servicii'
        ELSE 'Alte servicii prestate de terți' 
    END;

    SET @nc_id = GetOrCreateCurrentNC(v_data_f);
    
    INSERT INTO OPERATII_NOTA_CONTABILA (id_nota_contabila, debit1, debit2, credit1, suma_debit1, suma_debit2, suma_credit1, explicatii)
    VALUES (@nc_id, v_cont_str, '4426', CONCAT('401.', v_id_p), NEW.total_net, NEW.suma_tva, NEW.total_brut, v_expl);
    
    CALL calcul_total_factura(NEW.id_factura);
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `validare_inainte_inserare_serviciu_factura` BEFORE INSERT ON `servicii_factura` FOR EACH ROW BEGIN
    DECLARE v_tip VARCHAR(20);

    SELECT tip INTO v_tip FROM FACTURI WHERE id = NEW.id_factura;

    IF v_tip = 'primită' THEN
        IF NEW.total_net <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valoarea netă trebuie să fie pozitivă.';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `utilizatori`
--

CREATE TABLE `utilizatori` (
  `id` int(11) NOT NULL,
  `id_firma` int(11) NOT NULL,
  `nume_utilizator` varchar(100) NOT NULL,
  `nume` varchar(50) NOT NULL,
  `prenume` varchar(50) NOT NULL,
  `parola` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `rol` enum('admin','user') NOT NULL,
  `data_creare` datetime DEFAULT current_timestamp()
) ;

--
-- Eliminarea datelor din tabel `utilizatori`
--

INSERT INTO `utilizatori` (`id`, `id_firma`, `nume_utilizator`, `nume`, `prenume`, `parola`, `email`, `rol`, `data_creare`) VALUES
(1, 1, 'admin_cristina', 'admin', 'admin', '$2b$10$oj7GQkJcY6vXZ5Bhvh294e4UcXN743.tTak2T/7qXf184Nx0y7hn2', 'admin@cristina.com', 'admin', '2026-06-14 17:45:52'),
(2, 1, 'contabil1_cristina', 'contabil1', 'contabil1', '$2b$10$yn/vhOeTJ5j10jSiIi5Ooup0ngN3Z905LwxaKJ4bt0xWG.ZtLUj2W', 'contabil1@cristina.com', 'user', '2026-06-14 17:46:06'),
(3, 1, 'contabil2_cristina', 'contabil2', 'contabil2', '$2b$10$HHXSuu8ijE9wNgyHi7j/Y.B4cxE36C1HwRz/nqYeJrdXo4MEmB1Y6', 'contabil2@cristina.com', 'user', '2026-06-14 17:46:18');

--
-- Declanșatori `utilizatori`
--
DELIMITER $$
CREATE TRIGGER `force_user_to_firma` BEFORE INSERT ON `utilizatori` FOR EACH ROW BEGIN
    DECLARE v_id_firma INT;
    SELECT id INTO v_id_firma FROM FIRME LIMIT 1;
    IF v_id_firma IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Eroare: Trebuie să adăugați firma înainte de a crea utilizatori!';
    END IF;
    SET NEW.id_firma = v_id_firma;
END
$$
DELIMITER ;

--
-- Indexuri pentru tabele eliminate
--

--
-- Indexuri pentru tabele `amortizari`
--
ALTER TABLE `amortizari`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_mijloc_fix` (`id_mijloc_fix`);

--
-- Indexuri pentru tabele `facturi`
--
ALTER TABLE `facturi`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numar` (`numar`),
  ADD KEY `id_partener` (`id_partener`),
  ADD KEY `id_utilizator` (`id_utilizator`);

--
-- Indexuri pentru tabele `firme`
--
ALTER TABLE `firme`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cui` (`cui`),
  ADD UNIQUE KEY `nr_reg_comert` (`nr_reg_comert`),
  ADD UNIQUE KEY `iban` (`iban`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `telefon` (`telefon`);

--
-- Indexuri pentru tabele `istoric_preturi_vanzare`
--
ALTER TABLE `istoric_preturi_vanzare`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_marfa` (`id_marfa`);

--
-- Indexuri pentru tabele `marfuri`
--
ALTER TABLE `marfuri`
  ADD PRIMARY KEY (`id`);

--
-- Indexuri pentru tabele `mijloace_fixe`
--
ALTER TABLE `mijloace_fixe`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nr_inventar` (`nr_inventar`),
  ADD KEY `id_factura` (`id_factura`);

--
-- Indexuri pentru tabele `mijloace_fixe_factura`
--
ALTER TABLE `mijloace_fixe_factura`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_factura` (`id_factura`),
  ADD KEY `id_mijloc_fix` (`id_mijloc_fix`);

--
-- Indexuri pentru tabele `note_contabile`
--
ALTER TABLE `note_contabile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numar` (`numar`);

--
-- Indexuri pentru tabele `obiecte_inventar`
--
ALTER TABLE `obiecte_inventar`
  ADD PRIMARY KEY (`id`);

--
-- Indexuri pentru tabele `obiecte_inventar_factura`
--
ALTER TABLE `obiecte_inventar_factura`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_factura` (`id_factura`),
  ADD KEY `id_obiect_inventar` (`id_obiect_inventar`);

--
-- Indexuri pentru tabele `operatii_nota_contabila`
--
ALTER TABLE `operatii_nota_contabila`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_nota_contabila` (`id_nota_contabila`);

--
-- Indexuri pentru tabele `parteneri`
--
ALTER TABLE `parteneri`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cui` (`cui`),
  ADD UNIQUE KEY `nr_reg_comert` (`nr_reg_comert`),
  ADD UNIQUE KEY `iban` (`iban`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `telefon` (`telefon`);

--
-- Indexuri pentru tabele `plati_incasari`
--
ALTER TABLE `plati_incasari`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_factura` (`id_factura`);

--
-- Indexuri pentru tabele `produse_factura`
--
ALTER TABLE `produse_factura`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_factura` (`id_factura`),
  ADD KEY `id_marfa` (`id_marfa`);

--
-- Indexuri pentru tabele `servicii_factura`
--
ALTER TABLE `servicii_factura`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_factura` (`id_factura`);

--
-- Indexuri pentru tabele `utilizatori`
--
ALTER TABLE `utilizatori`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nume_utilizator` (`nume_utilizator`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `id_firma` (`id_firma`);

--
-- AUTO_INCREMENT pentru tabele eliminate
--

--
-- AUTO_INCREMENT pentru tabele `amortizari`
--
ALTER TABLE `amortizari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=153;

--
-- AUTO_INCREMENT pentru tabele `facturi`
--
ALTER TABLE `facturi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `firme`
--
ALTER TABLE `firme`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `istoric_preturi_vanzare`
--
ALTER TABLE `istoric_preturi_vanzare`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `marfuri`
--
ALTER TABLE `marfuri`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `mijloace_fixe`
--
ALTER TABLE `mijloace_fixe`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pentru tabele `mijloace_fixe_factura`
--
ALTER TABLE `mijloace_fixe_factura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pentru tabele `note_contabile`
--
ALTER TABLE `note_contabile`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT pentru tabele `obiecte_inventar`
--
ALTER TABLE `obiecte_inventar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `obiecte_inventar_factura`
--
ALTER TABLE `obiecte_inventar_factura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pentru tabele `operatii_nota_contabila`
--
ALTER TABLE `operatii_nota_contabila`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=241;

--
-- AUTO_INCREMENT pentru tabele `parteneri`
--
ALTER TABLE `parteneri`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `plati_incasari`
--
ALTER TABLE `plati_incasari`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pentru tabele `produse_factura`
--
ALTER TABLE `produse_factura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `servicii_factura`
--
ALTER TABLE `servicii_factura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pentru tabele `utilizatori`
--
ALTER TABLE `utilizatori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constrângeri pentru tabele eliminate
--

--
-- Constrângeri pentru tabele `amortizari`
--
ALTER TABLE `amortizari`
  ADD CONSTRAINT `amortizari_ibfk_1` FOREIGN KEY (`id_mijloc_fix`) REFERENCES `mijloace_fixe` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `facturi`
--
ALTER TABLE `facturi`
  ADD CONSTRAINT `facturi_ibfk_1` FOREIGN KEY (`id_partener`) REFERENCES `parteneri` (`id`),
  ADD CONSTRAINT `facturi_ibfk_2` FOREIGN KEY (`id_utilizator`) REFERENCES `utilizatori` (`id`) ON DELETE SET NULL;

--
-- Constrângeri pentru tabele `istoric_preturi_vanzare`
--
ALTER TABLE `istoric_preturi_vanzare`
  ADD CONSTRAINT `istoric_preturi_vanzare_ibfk_1` FOREIGN KEY (`id_marfa`) REFERENCES `marfuri` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `mijloace_fixe`
--
ALTER TABLE `mijloace_fixe`
  ADD CONSTRAINT `mijloace_fixe_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`) ON DELETE SET NULL;

--
-- Constrângeri pentru tabele `mijloace_fixe_factura`
--
ALTER TABLE `mijloace_fixe_factura`
  ADD CONSTRAINT `mijloace_fixe_factura_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mijloace_fixe_factura_ibfk_2` FOREIGN KEY (`id_mijloc_fix`) REFERENCES `mijloace_fixe` (`id`) ON DELETE SET NULL;

--
-- Constrângeri pentru tabele `obiecte_inventar_factura`
--
ALTER TABLE `obiecte_inventar_factura`
  ADD CONSTRAINT `obiecte_inventar_factura_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `obiecte_inventar_factura_ibfk_2` FOREIGN KEY (`id_obiect_inventar`) REFERENCES `obiecte_inventar` (`id`);

--
-- Constrângeri pentru tabele `operatii_nota_contabila`
--
ALTER TABLE `operatii_nota_contabila`
  ADD CONSTRAINT `operatii_nota_contabila_ibfk_1` FOREIGN KEY (`id_nota_contabila`) REFERENCES `note_contabile` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `plati_incasari`
--
ALTER TABLE `plati_incasari`
  ADD CONSTRAINT `plati_incasari_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`);

--
-- Constrângeri pentru tabele `produse_factura`
--
ALTER TABLE `produse_factura`
  ADD CONSTRAINT `produse_factura_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `produse_factura_ibfk_2` FOREIGN KEY (`id_marfa`) REFERENCES `marfuri` (`id`);

--
-- Constrângeri pentru tabele `servicii_factura`
--
ALTER TABLE `servicii_factura`
  ADD CONSTRAINT `servicii_factura_ibfk_1` FOREIGN KEY (`id_factura`) REFERENCES `facturi` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `utilizatori`
--
ALTER TABLE `utilizatori`
  ADD CONSTRAINT `utilizatori_ibfk_1` FOREIGN KEY (`id_firma`) REFERENCES `firme` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
